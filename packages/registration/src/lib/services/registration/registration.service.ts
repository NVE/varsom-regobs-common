import { Injectable, Inject } from '@angular/core';
import { Observable, from, Subscription, of, concat, forkJoin, timer, merge, combineLatest } from 'rxjs';
import { GeoHazard, AppMode, LoggerService, AppModeService, uuidv4, ObservableHelperService } from '@varsom-regobs-common/core';
import { switchMap, shareReplay, map, tap, catchError, mergeMap, toArray, take, filter, withLatestFrom, distinctUntilChanged, concatMap } from 'rxjs/operators';
import { IRegistration } from '../../models/registration.interface';
import { OfflineDbService, TABLE_NAMES } from '../offline-db/offline-db.service';
import { SyncStatus } from '../../models/sync-status.enum';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { ItemSyncCallbackService } from '../item-sync-callback/item-sync-callback.service';
import moment from 'moment';
import { RegistrationTid } from '../../models/registration-tid.enum';
import { Summary, AttachmentViewModel, RegistrationViewModel, AttachmentEditModel } from '@varsom-regobs-common/regobs-api';
import {IRegistrationModuleOptions, FOR_ROOT_OPTIONS_TOKEN } from '../../registration.module';
import { getAttachments, getRegistrationTidsForGeoHazard, hasAnyObservations, isObservationEmptyForRegistrationTid } from '../../registration.helpers';
import { ProgressService } from '../progress/progress.service';
import { InternetConnectivity } from 'ngx-connectivity';
import { KdvService } from '../kdv/kdv.service';
import cloneDeep from 'clone-deep';
import { IRegistrationType } from '../../models/registration-type.interface';
import { FallbackSummaryProvider } from '../summary-providers/fallback-provider';
import { RxRegistrationCollection, RxRegistrationDocument } from '../../db/RxDB';
import { NewAttachmentService } from '../add-new-attachment/new-attachment.service';
import deepEqual from 'fast-deep-equal';

const SYNC_TIMER_TRIGGER_MS = 60 * 1000; // try to trigger sync every 60 seconds if nothing has changed to network conditions
const SYNC_BUFFER_MS = 3 * 1000; // Wait at least 3 seconds before next sync attempt

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  public readonly registrationStorage$: Observable<IRegistration[]>;
  private _registrationSyncSubscription: Subscription;

  constructor(
    private offlineDbService: OfflineDbService,
    private loggerService: LoggerService,
    private progressService: ProgressService,
    private kdvService: KdvService,
    private internetConnectivity: InternetConnectivity,
    private appModeService: AppModeService,
    private observableHelperService: ObservableHelperService,
    private newAttachmentService: NewAttachmentService,
    @Inject('OfflineRegistrationSyncService') private offlineRegistrationSyncService: ItemSyncCallbackService<IRegistration>,
    // @Inject(SUMMARY_PROVIDER_TOKEN) private summaryProviders: ISummaryProvider[],
    private fallbackSummaryProvider: FallbackSummaryProvider,
    @Inject(FOR_ROOT_OPTIONS_TOKEN) private options: IRegistrationModuleOptions
  ) {
    this.registrationStorage$ = this.getRegistrationObservable().pipe(tap((reg) => {
      this.loggerService.debug('Registrations changed', reg);
    }), this.observableHelperService.enterZoneAndTickApplicationRef(), shareReplay(1));
    this.initAutoSync();
  }

  public saveAndSync(reg: IRegistration): Observable<boolean> {
    reg.syncStatus = SyncStatus.Sync;
    return this.saveRegistration(reg);
  }

  public saveRegistration(reg: IRegistration, updateChangedTimestamp = true): Observable<boolean> {
    if (updateChangedTimestamp) {
      reg.changed = moment().unix();
    }
    if(reg.syncStatus === SyncStatus.Sync) {
      return this.syncSingleRegistration(reg);
    }else{
      return this.saveRegistrationToOfflineStorage(reg).pipe(map(() => true));
    }
  }

  private saveRegistrationToOfflineStorage(reg: IRegistration): Observable<RxRegistrationDocument> {
    return this.getRegistrationOfflineDocumentById(reg.id).pipe(
      take(1),
      switchMap((doc) => doc ?
        from(this.updateDocInOfflineStorage(doc, reg)) :
        this.getRegistrationDbCollectionForAppMode().pipe(take(1), switchMap((collection) => from(collection.atomicUpsert(reg))))
      ));
  }

  private updateDocInOfflineStorage(doc: RxRegistrationDocument, reg: IRegistration): Promise<RxRegistrationDocument> {
    // We update doc instead of atomicUpdate, because when we use atomicUpdate attachments get lost...
    return doc.atomicUpdate((oldData) => {
      oldData.changed = reg.changed;
      oldData.syncStatus = reg.syncStatus;
      oldData.lastSync = reg.lastSync;
      oldData.syncError = reg.syncError;
      oldData.syncStatusCode = reg.syncStatusCode;
      oldData.request = reg.request;
      oldData.response = reg.response;
      oldData.changedRegistrationTid = reg.changedRegistrationTid;
      return oldData;
    });
  }

  private getAttachments(id: string) {
    return this.getRegistrationOfflineDocumentById(id).pipe(map((doc) => doc.allAttachments()));
  }

  public deleteRegistration(id: string): Observable<boolean> {
    return this.getRegistrationOfflineDocumentById(id).pipe(take(1),
      switchMap((doc) => (doc ? from(doc.remove()) : of(false))));
  }

  private shouldKeepWhenCleanup(reg: IRegistration) {
    if (reg.syncStatus === SyncStatus.Sync) {
      return true;
    }
    if (reg.syncStatus === SyncStatus.Draft && (reg.changed > moment().subtract(24, 'hours').unix())) {
      return true;
    }
    return false;
  }

  public getRetistrationById(id: string): Observable<IRegistration> {
    return this.registrationStorage$.pipe(map((registrations) => registrations.find((r) => r.id === id)));
  }

  public async cancelSync(): Promise<void> {
    await this.progressService.resetSyncProgress();
    if (this._registrationSyncSubscription) {
      this._registrationSyncSubscription.unsubscribe();
    }
    this.initAutoSync();
  }

  public initAutoSync(): void {
    if (this.options.autoSync) {
      this._registrationSyncSubscription = this.getAutoSyncObservable().subscribe();
    }
  }

  public getFirstDraftForGeoHazard(geoHazard: GeoHazard): Promise<IRegistration> {
    return this.getDraftsForGeoHazardObservable(geoHazard)
      .pipe(map((rows) => rows[0]), take(1)).toPromise();
  }

  public getDraftsForGeoHazardObservable(geoHazard: GeoHazard): Observable<IRegistration[]> {
    return this.registrationStorage$.pipe(map((records) =>
      records.filter((reg) =>
        reg.request.GeoHazardTID === geoHazard &&
        reg.syncStatus === SyncStatus.Draft
      )));
  }

  public createNewEmptyDraft(geoHazard: GeoHazard, cleanupRegistrationStorage = true): IRegistration {
    if (cleanupRegistrationStorage) {
      // this.cleanUpRegistrationStorage();
    }
    const id = uuidv4();
    const draft: IRegistration = {
      id,
      geoHazard,
      changed: moment().unix(),
      syncStatus: SyncStatus.Draft,
      request: {
        GeoHazardTID: geoHazard,
        DtObsTime: undefined,
        ObsLocation: {
        },
        Attachments: []
      },
    };
    return draft;
  }

  public editExisingRegistration(registrationViewModel: RegistrationViewModel): IRegistration {
    const reg = this.createNewEmptyDraft(registrationViewModel.GeoHazardTID);
    reg.request = cloneDeep(registrationViewModel);
    reg.response = cloneDeep(registrationViewModel);
    reg.syncStatus = SyncStatus.InSync;
    return reg;
  }

  public makeExistingRegistrationEditable(reg: IRegistration): void {
    if (reg && reg.syncStatus === SyncStatus.InSync) {
      reg.request = cloneDeep(reg.response);
    }
  }

  public syncRegistrations(): Observable<IRegistration[]> {
    return this.getRegistrationsToSyncObservable().pipe(take(1), this.resetProgressAndSyncItems());
  }

  public syncSingleRegistration(reg: IRegistration): Observable<boolean> {
    if (!reg) {
      return of(false);
    }
    return of([reg]).pipe(this.resetProgressAndSyncItems(), map((result) => result.length > 0 && !result[0].syncError));
  }

  // public addAttachment(id: string, geoHazardTid: GeoHazard, registrationTid: RegistrationTid, data: ArrayBuffer, mimeType: string): Observable<unknown> {
  //   const attachmentId = uuidv4();
  //   return this.getRegistrationOfflineDocumentById(id).pipe(take(1), switchMap((doc) =>
  //     this.saveAttachmentMeta({
  //       id: attachmentId,
  //       GeoHazardTID: geoHazardTid,
  //       RegistrationTID: registrationTid,
  //       // fileSize: data.length,
  //       AttachmentMimeType: mimeType,
  //       ref: undefined, //TODO: add ref parameter
  //       type: undefined, // TODO add type parameter
  //     }).pipe(switchMap(() => from(doc.putAttachment({
  //       id: attachmentId,
  //       data,
  //       type: mimeType
  //     }
  //     ))))));
  // }

  // private getAttachmentMeta(id: string): Observable<AttachmentUploadEditModel> {
  //   return this.getAttachmentMetaDbCollectionForAppMode().pipe(
  //     switchMap((collection) => collection.findByIds$([id]).pipe(map((result) => result.get(id)))));
  // }

  // private saveAttachmentMeta(attachmentMetaData: AttachmentUploadEditModel) {
  //   return this.getAttachmentMetaDbCollectionForAppMode().pipe(
  //     take(1),
  //     switchMap((dbCollection) => from(dbCollection.atomicUpsert(attachmentMetaData)) ));
  // }

  // /**
  //  * Get new uploaded attachments for registration by id
  //  */
  // public getNewAttachments(id: string): Observable<AttachmentUploadEditModel[]> {
  //   return this.getRegistrationOfflineDocumentById(id).pipe(
  //     switchMap((doc) => doc ? forkJoin(doc.allAttachments().map((attachment) =>
  //       this.getAttachmentMeta(attachment.id).pipe(take(1))))
  //       : of([])));
  // }

  // /**
  //  * Get new uploaded attachment blob by registration id and attachment id
  //  */
  // public getAttachmentBlob(id: string, attachmentId: string): Observable<Blob> {
  //   return this.getRegistrationOfflineDocumentById(id).pipe(
  //     filter((doc) => !!doc),
  //     switchMap((doc) => of(doc.getAttachment(attachmentId))),
  //     filter((attachment) => !!attachment),
  //     switchMap((attachment) => from(attachment.getData())));
  // }

  private getAutoSyncObservable() {
    return this.getAutosyncChangeTrigger().pipe(
      tap((source) => this.loggerService.debug(`Auto sync triggered. Source: ${source}`)),
      switchMap(() => this.offlineDbService.waitForLeadership()),
      tap(() => this.loggerService.debug('Current tab is in leadership, so this tab is used for sync items')),
      switchMap(() => this.getRegistrationsToSyncObservable()),
      this.filterWhenProgressIsAllreadyRunning(),
      this.resetProgressAndSyncItems()
    );
  }

  private getAutosyncChangeTrigger() {
    const networkOrTimerTrigger$ = merge(
      this.getNetworkOnlineObservable().pipe(map(() => 'network status online trigger')),
      timer(SYNC_TIMER_TRIGGER_MS, SYNC_TIMER_TRIGGER_MS).pipe(map(() => 'timer trigger')));
    return this.getRegistrationsToSyncObservable(false).pipe(
      map((records) => records.length > 0),
      filter((hasRecords) => hasRecords),
      switchMap(() => networkOrTimerTrigger$));
  }

  private resetProgressAndSyncItems(): (src: Observable<IRegistration[]>) => Observable<IRegistration[]> {
    return (src: Observable<IRegistration[]>) =>
      src.pipe(concatMap((records) => from(this.progressService.resetSyncProgress(records.map((r) => r.id))).pipe(map(() => records))),
        this.flattenRegistrationsToSync(),
        tap((row) => this.progressService.setSyncProgress(row.item.id, row.error)),
        this.updateRowAndReturnItem(),
        toArray(),
        catchError((error) => {
          this.loggerService.warn('Could not sync registrations', error);
          return of([]);
        }),
        tap(() => this.progressService.resetSyncProgress()));
  }

  /***
   * Check if registration has any data or attachments for registrationTid
   */
  hasAnyData(reg: IRegistration, registrationTid: RegistrationTid): Observable<boolean> {
    return of(isObservationEmptyForRegistrationTid(reg, registrationTid)).pipe((switchMap((isEmpty) => {
      if(!isEmpty) {
        return of(true);
      }
      return this.newAttachmentService.getUploadedAttachments(reg.id).pipe(take(1),
        map((newAttachments) => newAttachments.some((a) => a.RegistrationTID === registrationTid)));
    })));
  }

  getRegistrationTypesWithAnyData(reg: IRegistration): Observable<IRegistrationType[]> {
    return this.getRegistrationTypesForGeoHazard(reg.geoHazard).pipe(
      switchMap((regTypes) => regTypes.length > 0 ? forkJoin(regTypes.map((regType) => this.hasAnyData(reg, regType.registrationTid)
        .pipe(map((anyData) => ({  anyData, regType }))))) : of([])),
      map((result) => result.filter((r) => r.anyData).map((r) => r.regType)));
  }

  public getSummaryForRegistrationTidById$(id: string, registrationTid: RegistrationTid): Observable<Summary[]> {
    return this.getRetistrationById(id).pipe(switchMap((reg) => this.getSummaryForRegistrationTid(reg, registrationTid)));
  }

  /**
   * Converts a registration draft to summary as the same model as generated from the API
   * @param reg Registration draft
   * @param registrationTid Registration tid
   */
  public getDraftSummary(reg: IRegistration, registrationTid: RegistrationTid, addIfEmpty = true): Observable<Summary[]> {
    if (!isObservationEmptyForRegistrationTid(reg, registrationTid)) {
      // const provider = this.summaryProviders.find((p) => p.registrationTid === registrationTid);
      // if (provider) {
      //   return provider.generateSummary(reg);
      // }
      // TODO: Implement all providers to get summaries generated client side before synchronized to API...
      return this.fallbackSummaryProvider.generateSummary(reg, registrationTid).pipe(tap((genericSummary) =>
        this.loggerService.debug('Generic fallback summary', genericSummary)));
    }
    return addIfEmpty ? this.generateEmptySummary(registrationTid).pipe(map((s) => [s])) : of([]);
  }

  public getSummaryForRegistrationTid(reg: IRegistration, registrationTid: RegistrationTid, addIfEmpty = true): Observable<Summary[]> {
    // return (reg.syncStatus === SyncStatus.InSync) ?
    //   this.getResponseSummaryForRegistrationTid(reg, registrationTid, addIfEmpty)
    //   : this.getDraftSummary(reg, registrationTid, addIfEmpty);
    if(reg.changedRegistrationTid === registrationTid && reg.syncStatus !== SyncStatus.InSync) {
      return this.getDraftSummary(reg, registrationTid, addIfEmpty);
    }
    return this.getResponseSummaryForRegistrationTid(reg, registrationTid, addIfEmpty);
  }

  public getRegistrationName(registrationTid: RegistrationTid): Observable<string> {
    return this.kdvService.getKdvRepositoryByKeyObservable('RegistrationKDV').pipe(
      map((kdvElements) => kdvElements.find((kdv) => kdv.Id === registrationTid)), map((val) => val ? val.Name : ''));
  }

  private getResponseSummaryForRegistrationTid(reg: IRegistration, registrationTid: RegistrationTid, addIfEmpty = true): Observable<Summary[]> {
    if (reg && reg.response && reg.response.Summaries && reg.response.Summaries.length > 0) {
      const summary = reg.response.Summaries.filter(x => x.RegistrationTID === registrationTid);
      if (summary) {
        return of(summary);
      }
    }
    return addIfEmpty ? this.generateEmptySummary(registrationTid).pipe(map((s) => [s])) : of([]);
  }

  private generateEmptySummary(registrationTid: RegistrationTid): Observable<Summary> {
    return this.getRegistrationName(registrationTid).pipe(map((registrationName) => ({
      RegistrationTID: registrationTid,
      RegistrationName: registrationName,
      Summaries: []
    })));
  }

  // public getRegistrationEditFromsWithSummaries(id: string): Observable<{ reg: IRegistration; forms: SummaryWithAttachments[] }> {
  //   return this.registrationStorage$.pipe(
  //     tap((val) => this.loggerService.debug(() => 'getRegistrationEditFromsWithSummaries', val, id)),
  //     map((registrations) => registrations.find((r) => r.id === id)),
  //     filter((val) => !!val),
  //     switchMap((reg) => this.getRegistrationFormsWithSummaries(reg, false).pipe(
  //       map((forms) => ({
  //         reg,
  //         forms
  //       })))));
  // }

  // public getRegistrationFormsWithSummaries(reg: IRegistration, generateEmptySummaries = true): Observable<SummaryWithAttachments[]> {
  //   return this.getRegistrationTypesForGeoHazard(reg.geoHazard).pipe(
  //     switchMap((registrationTypes) =>
  //       forkJoin(this.getRegistrationTids(registrationTypes).map((registrationTid) =>
  //         this.getSummaryAndAttachments(reg, registrationTid, generateEmptySummaries)))
  //         .pipe(map((summaryAndAttachments) => this.mapToSummaryWithAttachments(registrationTypes, summaryAndAttachments)))
  //     ));
  // }

  // private mapToSummaryWithAttachments(
  //   registrationTypes: IRegistrationType[],
  //   summaryAndAttachments: { registrationTid: RegistrationTid; summaries: Summary[]; attachments: ExistingOrNewAttachment[] }[]):
  //   SummaryWithAttachments[] {
  //   return (registrationTypes || []).map((regType) => {
  //     const summaryAndAttachmentsForRegType = summaryAndAttachments.find((s) => s.registrationTid === regType.registrationTid);
  //     const result: SummaryWithAttachments = {
  //       registrationTid: regType.registrationTid,
  //       name: regType.name,
  //       attachments: (summaryAndAttachmentsForRegType && summaryAndAttachmentsForRegType.attachments) ? summaryAndAttachmentsForRegType.attachments : undefined,
  //       summaries: (summaryAndAttachmentsForRegType && summaryAndAttachmentsForRegType.summaries) ? summaryAndAttachmentsForRegType.summaries : undefined,
  //       subTypes: this.mapToSummaryWithAttachments(regType.subTypes, summaryAndAttachments),
  //     };
  //     return result;
  //   });
  // }

  // private getRegistrationTids(registrationTypes: IRegistrationType[]): RegistrationTid[] {
  //   const result: RegistrationTid[] = [];
  //   for (const r of registrationTypes) {
  //     result.push(r.registrationTid);
  //     if (r.subTypes && r.subTypes.length > 0) {
  //       result.push(...this.getRegistrationTids(r.subTypes));
  //     }
  //   }
  //   return result;
  // }

  public getRegistrationTypesForGeoHazard(geoHazard: GeoHazard): Observable<IRegistrationType[]> {
    const registrationTidsForGeoHazard = getRegistrationTidsForGeoHazard(geoHazard);

    const flatViewrepository$ = this.kdvService.getViewRepositoryByKeyObservable('RegistrationTypesV')
      .pipe(
        map((val) => this.parseViewRepositoryType(val[`${geoHazard}`])),
        map((result) => this.flattenRegistrationTypes(result)),
        map((result) => result.filter((val) => registrationTidsForGeoHazard.indexOf(val.registrationTid) >= 0))
      );

    return of(registrationTidsForGeoHazard).pipe(switchMap((registrationTids) =>
      flatViewrepository$.pipe(
        map((vr) => registrationTids.map((registrationTid) => vr.find((v) => v.registrationTid === registrationTid)),
          filter((result) => !!result)
        ))));
  }

  private flattenRegistrationTypes(types: IRegistrationType[]) {
    const arr = types.map((t) => (t.subTypes && t.subTypes.length > 0) ? t.subTypes : [t]);
    return arr.reduce((a, b) => a.concat(b), []);
  }

  private parseViewRepositoryType(val: unknown[]): IRegistrationType[] {
    if (!val) {
      return [];
    }
    return val.map((v) => {
      const result: IRegistrationType = {
        registrationTid: v['Id'],
        name: v['Name'],
        sortOrder: v['SortOrder'],
        subTypes: this.parseViewRepositoryType(v['SubTypes']),
      };
      return result;
    });
  }

  // private getLatestRegistrationDocumentRevision(id: string): Observable<string> {
  //   return this.getRegistrationOfflineDocumentById(id).pipe(take(1), map((doc) => doc.revision));
  // }

  // public rollbackToRevision$(id: string, revId: string): Observable<unknown> {
  //   return this.getRegistrationDbCollectionForAppMode().pipe(
  //     switchMap((collection) =>
  //       from(this.removeAllRevisionsUntil(id, revId, collection)))
  //   );
  // }

  public saveRollbackState$(id: string): Observable<unknown> {
    return combineLatest([this.getRegistrationDbCollectionForAppMode(), this.getRetistrationById(id)]).pipe(
      take(1),
      switchMap(([collection, reg]) =>
        reg ? from(collection.upsertLocal(`undo_state_${id}`, { reg })) : of({})
      ));
  }

  public saveRollbackState(id: string): void {
    this.saveRollbackState$(id).subscribe();
  }

  /**
   * Rollback registration to last known undo state (as observable)
   */
  public rollbackChanges$(id: string): Observable<boolean>  {
    return this.getRegistrationDbCollectionForAppMode().pipe(
      switchMap((collection) => from(collection.getLocal(`undo_state_${id}`)).pipe(map((doc) => doc ?  doc['reg'] : undefined))),
      switchMap((reg: IRegistration) => reg ?
        this.saveRegistrationToOfflineStorage(reg).pipe(
          switchMap(() => this.newAttachmentService.removeAttachmentsForRegistration$(id)),
          map(() => true))
        : of(false)));
  }

  /**
   * Rollback registration to last known undo state
   */
  public rollbackChanges(id: string): void {
    this.rollbackChanges$(id).subscribe();
  }

  // private getLatestRollbackRev$(id: string): Observable<string> {
  //   return this.getRegistrationDbCollectionForAppMode().pipe(
  //     switchMap((collection) => from(collection.getLocal(`latest_rev_${id}`)).pipe(map((doc) => doc ? doc.get('revId') : undefined)))
  //   );
  // }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // private async getRegistrationByRevision(id: string, revId: string, collection: RxRegistrationCollection): Promise<any> {
  //   const res = await collection.pouch.get(id, {
  //     rev: revId,
  //     revs: true,
  //     open_revs: 'all', // this allows me to also get the removed "docs"
  //     revs_info: false // If true, includes a list of revisions of the document, and their availability.
  //   });
  //   if(res && res.length > 0 && res[0] && res[0].ok) {
  //     return res[0].ok;
  //   }
  //   return undefined;
  // }

  // private async removeAllRevisionsUntil(id: string, revId: string, collection: RxRegistrationCollection): Promise<void> {
  //   const revs = await collection.pouch.get(id, {
  //     revs: true,
  //     open_revs: 'all', // this allows me to also get the removed "docs"
  //     revs_info: true
  //   });
  //   if(revs.length && revs[0].ok && revs[0].ok._revisions && revs[0].ok._revisions.ids && revs[0].ok._revisions.ids.length > 0) {
  //     this.loggerService.debug(`Remove all document revisions until ${revId}:`, revs[0].ok._revisions.ids);
  //     const start = revs[0].ok._revisions.start;
  //     for(const rev of revs[0].ok._revisions.ids.reverse()) {
  //       const sRev = `${start}-${rev}`;
  //       if(sRev !== revId) {
  //         try{
  //           const doc = await collection.pouch.get(id, {
  //             rev: rev,
  //             revs: true,
  //             open_revs: 'all'
  //           });
  //           if(doc && doc[0] && doc[0].ok) {
  //             await collection.pouch.remove(id, rev);
  //           }
  //         }catch(err) {
  //           this.loggerService.debug(err);
  //         }
  //       }
  //     }
  //   }
  // }

  // public getRegistrationViewModelFormsWithSummaries(regViewModel: RegistrationViewModel, generateEmptySummaries = true): Observable<SummaryWithAttachments[]> {
  //   const reg: IRegistration = this.editExisingRegistration(regViewModel);
  //   return this.getRegistrationFormsWithSummaries(reg, generateEmptySummaries);
  // }

  // private getSummaryAndAttachments(reg: IRegistration, registrationTid: RegistrationTid, addIfEmpty = true) {
  //   return this.getSummaryForRegistrationTid(reg, registrationTid, addIfEmpty)
  //     .pipe(withLatestFrom(this.getAttachmentForRegistration(reg, registrationTid)),
  //       map(([summaries, attachments]) => ({ registrationTid, summaries, attachments })));
  // }

  // public getAttachmentForRegistration(reg: IRegistration, registrationTid: RegistrationTid): Observable<ExistingOrNewAttachment[]> {
  //   return this.newAttachmentService.getUploadedAttachments(reg.id).pipe(
  //     map((uploaded) =>
  //       [
  //         ...uploaded.filter((u) => u.RegistrationTID === registrationTid),
  //         ...(reg.syncStatus === SyncStatus.InSync ? this.getResponseAttachmentsForRegistrationTid(reg, registrationTid) : getAttachments(reg, registrationTid))
  //       ]
  //     ));
  // }

  public getAttachmentForRegistration(id: string, registrationTid: RegistrationTid): Observable<AttachmentEditModel[]> {
    return this.getRetistrationById(id).pipe(map((reg) => getAttachments(reg, registrationTid)));
  }

  public getResponseAttachmentsForRegistrationTid(reg: IRegistration, registrationTid: RegistrationTid): AttachmentViewModel[] {
    if (!reg || !reg.response || !reg.response.Attachments) {
      return [];
    }
    return reg.response.Attachments.filter((a) => a.RegistrationTID === registrationTid);
  }

  private getRegistrationOfflineDocumentById(id: string): Observable<RxRegistrationDocument> {
    return this.getRegistrationDbCollectionForAppMode().pipe(
      switchMap((dbCollection) => dbCollection.findByIds$([id])),
      map((result) => result.get(id)));
  }

  private getRegistrationObservable(): Observable<IRegistration[]> {
    return this.getRegistrationDbCollectionForAppMode().pipe(
      switchMap((dbCollection) => dbCollection.find().$.pipe(map((docs) => docs.map((doc) => doc.toJSON())))),
      distinctUntilChanged((a, b) => deepEqual(a, b)));
  }

  private getRegistrationsDbCollection(appMode: AppMode): RxRegistrationCollection {
    return this.offlineDbService.getDbCollection<RxRegistrationCollection>(appMode, TABLE_NAMES.REGISTRATION);
  }

  private getRegistrationDbCollectionForAppMode(): Observable<RxRegistrationCollection> {
    return this.appModeService.appMode$.pipe(map((appMode) => this.getRegistrationsDbCollection(appMode)));
  }

  // private getAttachmentMetaDbCollection(appMode: AppMode): RxAttachmentMetaCollection {
  //   return this.offlineDbService.getDbCollection<RxAttachmentMetaCollection>(appMode, TABLE_NAMES.ATTACHMENT_META);
  // }

  // private getAttachmentMetaDbCollectionForAppMode(): Observable<RxAttachmentMetaCollection> {
  //   return this.appModeService.appMode$.pipe(map((appMode) => this.getAttachmentMetaDbCollection(appMode)));
  // }

  private getNetworkOnlineObservable(): Observable<boolean> {
    return this.internetConnectivity.isOnline$.pipe(
      distinctUntilChanged(),
      filter((online) => online),
      tap(() => this.loggerService.debug('App is now online!'))
    );
  }

  private filterWhenProgressIsAllreadyRunning() {
    return (src: Observable<IRegistration[]>) =>
      src.pipe(withLatestFrom(this.progressService.registrationSyncProgress$),
        filter(([, syncProgress]) => !syncProgress.inProgress),
        map(([records]) => records));
  }

  private getRegistrationsToSyncObservable(includeThrottle = false) {
    return this.registrationStorage$.pipe(
      switchMap((records) =>
        records.length > 0 ?
          forkJoin(records.map((reg) => this.shouldSync(reg, includeThrottle).pipe(map((shouldSync) => ({ reg, shouldSync })))))
          : of([])
      ),
      map((result) => result.filter((result) => result.shouldSync).map((result) => result.reg)));
  }

  private hasAnyNewAttachments(id: string): Observable<boolean> {
    return this.newAttachmentService.getUploadedAttachments(id).pipe(map((attachments) => attachments.length > 0));
  }

  private isNotEmpty(reg: IRegistration): Observable<boolean> {
    const notEmpty = hasAnyObservations(reg);
    if (notEmpty) {
      return of(true);
    }
    return this.hasAnyNewAttachments(reg.id);
  }

  private shouldSync(reg: IRegistration, includeThrottle = false): Observable<boolean> {
    if (reg.syncStatus === SyncStatus.Sync) {
      if (includeThrottle && this.shouldThrottle(reg)) {
        return of(false);
      }
      if (reg.response && reg.response.RegId > 0) {
        return of(true); // Edit existing registration should sync even if empty (deleted observation)
      }
      return this.isNotEmpty(reg).pipe(take(1));
    }
    return of(false);
  }

  private shouldThrottle(reg: IRegistration) {
    if (!reg.lastSync) {
      return false;
    }
    if (reg.changed > reg.lastSync) {
      return false;
    }
    const msToNextSync = this.getMsUntilNextSync(reg.lastSync, SYNC_BUFFER_MS);
    if (msToNextSync > 0) {
      this.loggerService.debug(`Should throttle: ${msToNextSync / 1000}`, reg);
      return true;
    }
    return false;
  }

  private getMsUntilNextSync(lastSyncTimeUnixTimestamp: number, timeout: number) {
    const msSinceLastSync = (moment().unix() - lastSyncTimeUnixTimestamp) * 1000;
    return timeout - msSinceLastSync;
  }

  private flattenRegistrationsToSync() {
    return (src: Observable<IRegistration[]>) =>
      src.pipe(mergeMap((rows) =>
        concat(rows.map((row) => (this.syncRecord(row)))),
      ), mergeMap((r) => r));
  }

  private syncRecord(item: IRegistration): Observable<ItemSyncCompleteStatus<IRegistration>> {
    return this.offlineRegistrationSyncService.syncItem(item).pipe(
      catchError((err) => of(({ item, success: false, error: err }))),
      tap((result) => this.loggerService.log('Record sync complete', result)));
  }

  private mapItemSyncCompleteStatusToRegistration(): (src: Observable<ItemSyncCompleteStatus<IRegistration>>) =>
  Observable<IRegistration>  {
    return (src: Observable<ItemSyncCompleteStatus<IRegistration>>) =>
      src.pipe(map((r: ItemSyncCompleteStatus<IRegistration>) => ({
        ...r.item,
        lastSync: moment().unix(),
        syncStatus: r.success ? SyncStatus.InSync : (r.statusCode === 0 ? SyncStatus.Sync : SyncStatus.Draft),
        syncStatusCode: r.statusCode,
        syncError: r.error,
      })));
  }

  private updateRowAndReturnItem(): (src: Observable<ItemSyncCompleteStatus<IRegistration>>) =>
    Observable<IRegistration> {
    return (src: Observable<ItemSyncCompleteStatus<IRegistration>>) =>
      src.pipe(this.mapItemSyncCompleteStatusToRegistration(),
        switchMap((item: IRegistration) =>
          this.saveRegistrationToOfflineStorage(item)
            .pipe(catchError((err) => {
              this.loggerService.error('Could not update record in offline storage', err);
              return of([]);
            }), map(() => item)))
      );
  }
}
