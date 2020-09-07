import { Injectable, Inject } from '@angular/core';
import { Observable, from, Subscription, of, concat, forkJoin, timer, BehaviorSubject, merge, Subject } from 'rxjs';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { GeoHazard, AppMode, LoggerService } from '@varsom-regobs-common/core';
import { switchMap, shareReplay, map, tap, catchError, debounceTime, mergeMap, toArray, take, filter, withLatestFrom, distinctUntilChanged, concatMap } from 'rxjs/operators';
import { uuid } from '@nano-sql/core/lib/utilities';
import { IRegistration } from '../../models/registration.interface';
import { OfflineDbService } from '../offline-db/offline-db.service';
import { SyncStatus } from '../../models/sync-status.enum';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { ItemSyncCallbackService } from '../item-sync-callback/item-sync-callback.service';
import moment from 'moment';
import { RegistrationTid } from '../../models/registration-tid.enum';
import { Summary, AttachmentViewModel, RegistrationViewModel, RegistrationCard } from '@varsom-regobs-common/regobs-api';
import {IRegistrationModuleOptions, FOR_ROOT_OPTIONS_TOKEN } from '../../registration.module';
import { hasAnyObservations, getAttachments, isObservationEmptyForRegistrationTid } from '../../registration.helpers';
import { ProgressService } from '../progress/progress.service';
import { InternetConnectivity } from 'ngx-connectivity';
import { KdvService } from '../kdv/kdv.service';
import { ExistingOrNewAttachment } from '../../models/attachment-upload-edit.interface';
import { SummaryWithAttachments } from '../../models/summary/summary-with-attachments';
import cloneDeep from 'clone-deep';
import { AddNewAttachmentService } from '../add-new-attachment/add-new-attachment.service';
import { IRegistrationType } from '../../models/registration-type.interface';
import { FallbackSummaryProvider } from '../summary-providers/fallback-provider';
// import { RegistrationCardWithAttachments } from '../../models/registration-cards/registration-card-with-attachments';

const SYNC_TIMER_TRIGGER_MS = 60 * 1000; // try to trigger sync every 60 seconds if nothing has changed to network conditions
const SYNC_DEBOUNCE_TIME = 200;
const SYNC_BUFFER_MS = 3 * 1000; // Wait at least 3 seconds before next sync attempt

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  public readonly registrationStorage$: Observable<IRegistration[]>;
  private _registrationSyncSubscription: Subscription;
  private _inMemoryRegistrations: BehaviorSubject<{ appMode: AppMode; reg: IRegistration }[]>;
  private _inMemoryRegistrationsReady = new Subject();

  constructor(
    private offlineDbService: OfflineDbService,
    private loggerService: LoggerService,
    private progressService: ProgressService,
    private kdvService: KdvService,
    private addNewAttachmentService: AddNewAttachmentService,
    private internetConnectivity: InternetConnectivity,
    @Inject('OfflineRegistrationSyncService') private offlineRegistrationSyncService: ItemSyncCallbackService<IRegistration>,
    // @Inject(SUMMARY_PROVIDER_TOKEN) private summaryProviders: ISummaryProvider[],
    private fallbackSummaryProvider: FallbackSummaryProvider,
    @Inject(FOR_ROOT_OPTIONS_TOKEN) private options: IRegistrationModuleOptions
  ) {
    this._inMemoryRegistrations = new BehaviorSubject<{ appMode: AppMode; reg: IRegistration }[]>([]);
    this.offlineDbService.appModeInitialized$.subscribe((appMode) => this.updateInMemoryRegistrationsFromOfflineStorage(appMode));
    this.registrationStorage$ = this.offlineDbService.appModeInitialized$.pipe(
      switchMap((appMode) => this.getRegistrationObservable(appMode)), tap((reg) => {
        this.loggerService.debug('Registrations changed', reg);
      }), shareReplay(1));
    this._inMemoryRegistrationsReady.subscribe(() => {
      this.registrationStorage$.pipe(withLatestFrom(this.offlineDbService.appModeInitialized$),
        switchMap(([registrations, appMode]) => from(this.saveRegistrationsToOfflineStorage(appMode, registrations)))).subscribe();
    });
    this.updateRegistrationChangedOnAttachmentUploaded();
    this.cancelSync();
  }

  public saveRegistration(reg: IRegistration, updateChangedTimestamp = true): Observable<void> {
    return this.offlineDbService.appModeInitialized$.pipe(take(1), map((appMode) => {
      this.loggerService.debug('Save registration', reg, updateChangedTimestamp);
      if (updateChangedTimestamp) {
        reg.changed = moment().unix();
      }
      this._inMemoryRegistrations.next([...this._inMemoryRegistrations.value.filter((val) => val.reg.id !== reg.id), { appMode, reg }]);
    }));
  }

  public deleteRegistration(id: string): Observable<void> {
    return this.getRetistrationById(id).pipe(
      take(1),
      switchMap((reg) => this.offlineRegistrationSyncService.deleteItem(reg)),
      switchMap(() => of(this._inMemoryRegistrations.next(this._inMemoryRegistrations.value.filter((val) => val.reg.id !== id))))
    );
  }

  public cleanUpRegistrationStorage(): void {
    this._inMemoryRegistrations.next(this._inMemoryRegistrations.value.filter((val) => this.shouldKeepWhenCleanup(val.reg)));
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

  private getRegistrationsFromOfflineStorage(appMode: AppMode): Observable<IRegistration[]> {
    return from(this.offlineDbService.getDbInstance(appMode).selectTable(TABLE_NAMES.REGISTRATION).query('select').exec()) as Observable<IRegistration[]>;
  }

  private updateInMemoryRegistrationsFromOfflineStorage(appMode: AppMode) {
    this.getRegistrationsFromOfflineStorage(appMode).pipe(
      map((offlineRegistrations) => offlineRegistrations.map((reg) => ({ appMode, reg }))))
      .subscribe((offlineRegistrations) => {
        this._inMemoryRegistrations.next(offlineRegistrations);
        this._inMemoryRegistrationsReady.next();
        this._inMemoryRegistrationsReady.complete();
      });
  }

  private async saveRegistrationsToOfflineStorage(appMode: AppMode, registrations: IRegistration[]) {
    const table = this.offlineDbService.getDbInstance(appMode).selectTable(TABLE_NAMES.REGISTRATION);
    await table.query('delete').where(['id', 'NOT IN', registrations.map((r) => r.id)]).exec(); // Remove deleted items
    const result = await table.query('upsert', registrations).exec();
    this.loggerService.debug('Result from save registrations offline', result);
  }

  public cancelSync(): void {
    this.progressService.resetSyncProgress();
    if (this._registrationSyncSubscription) {
      this._registrationSyncSubscription.unsubscribe();
    }
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
      this.cleanUpRegistrationStorage();
    }
    const id = uuid();
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
    return this.getRegistrationsToSyncObservable().pipe(this.resetProgressAndSyncItems());
  }

  public syncSingleRegistration(reg: IRegistration): Observable<boolean> {
    if (!reg) {
      return of(false);
    }
    return of([reg]).pipe(this.resetProgressAndSyncItems(), map((result) => result.length > 0 && !result[0].syncError));
  }

  private getAutoSyncObservable() {
    return this.getAutosyncChangeTrigger().pipe(
      tap((source) => this.loggerService.debug(`Auto sync triggered. Source: ${source}`)),
      switchMap(() => this.getRegistrationsToSyncObservable()),
      this.filterWhenProgressIsAllreadyRunning(),
      this.resetProgressAndSyncItems()
    );
  }

  private getAutosyncChangeTrigger() {
    return merge(
      this.registrationStorage$.pipe(map(() => 'registrations changed trigger')),
      this.getNetworkOnlineObservable().pipe(map(() => 'network status online trigger')),
      timer(SYNC_TIMER_TRIGGER_MS, SYNC_TIMER_TRIGGER_MS).pipe(map(() => 'timer trigger'))
    ).pipe(debounceTime(SYNC_DEBOUNCE_TIME));
  }

  private resetProgressAndSyncItems() {
    return (src: Observable<IRegistration[]>) =>
      src.pipe(tap((records) => this.progressService.resetSyncProgress(records.map((r) => r.id))),
        this.flattenRegistrationsToSync(),
        tap((row) => this.progressService.setSyncProgress(row.item.id, row.error)),
        this.updateRowAndReturnItem(),
        toArray(),
        catchError((error, caught) => {
          this.loggerService.warn('Could not sync registrations', error);
          return caught;
        }),
        tap(() => this.progressService.resetSyncProgress()));
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
    return (reg.syncStatus === SyncStatus.InSync) ?
      this.getResponseSummaryForRegistrationTid(reg, registrationTid, addIfEmpty)
      : this.getDraftSummary(reg, registrationTid, addIfEmpty);
  }

  // public getRegistrationCardForRegistrationTid(reg: IRegistration, registrationTid: RegistrationTid, addIfEmpty = true): Observable<RegistrationCard[]> {
  //   return this.getResponseRegistrationCardForRegistrationTid(reg, registrationTid, addIfEmpty);
  // }

  // public getResponseRegistrationCardForRegistrationTid(reg: IRegistration, registrationTid: RegistrationTid, addIfEmpty = true) {
  //   if (reg && reg.response && reg.response.RegistrationCards && reg.response.RegistrationCards.length > 0) {
  //     const registrationCard = reg.response.RegistrationCards.filter(card => card.RegistrationTID === registrationTid);

  //     if (registrationCard) {
  //       return of(registrationCard);
  //     }
  //   }

  //   return of([]);
  // }

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

  private updateRegistrationChangedOnAttachmentUploaded() {
    this.addNewAttachmentService.attachmentsChanged$.pipe(
      tap((val) => this.loggerService.debug('Attachment changed', val)),
      concatMap((change) => this.registrationStorage$.pipe(take(1), map((registrations) => registrations.find((r) => r.id === change.id)))),
      filter((reg: IRegistration) => !!reg),
      tap((val) => this.loggerService.debug('Attachment changed -> Update timestamp on registration.', val)),
      switchMap((reg: IRegistration) => this.saveRegistration(reg)))
      .subscribe();
  }

  private generateEmptySummary(registrationTid: RegistrationTid): Observable<Summary> {
    return this.getRegistrationName(registrationTid).pipe(map((registrationName) => ({
      RegistrationTID: registrationTid,
      RegistrationName: registrationName,
      Summaries: []
    })));
  }

  public getRegistrationEditFromsWithSummaries(id: string): Observable<{ reg: IRegistration; forms: SummaryWithAttachments[] }> {
    return this.registrationStorage$.pipe(
      tap((val) => this.loggerService.debug(() => 'getRegistrationEditFromsWithSummaries', val, id)),
      map((registrations) => registrations.find((r) => r.id === id)),
      filter((val) => !!val),
      switchMap((reg) => this.getRegistrationFormsWithSummaries(reg, false).pipe(
        map((forms) => ({
          reg,
          forms
        })))));
  }

  // public getRegistrationEditFormsWithRegistrationCards(id: string): Observable<{ reg: IRegistration; forms: RegistrationCardWithAttachments[] }> {
  //   return this.registrationStorage$.pipe(
  //     tap((val) => this.loggerService.debug(() => 'getRegistrationEditFormsWithRegistrationCards', val, id)),
  //     map((registrations) => registrations.find((r) => r.id === id)),
  //     filter((val) => !!val),
  //     switchMap((reg) => this.getRegistrationFormsWithRegistrationCards(reg, false).pipe(
  //       map((forms) => ({
  //         reg,
  //         forms
  //       })))));
  // }

  public getRegistrationFormsWithSummaries(reg: IRegistration, generateEmptySummaries = true): Observable<SummaryWithAttachments[]> {
    return this.getRegistrationTidsForGeoHazard(reg.geoHazard).pipe(
      switchMap((registrationTypes) =>
        forkJoin(this.getRegistrationTids(registrationTypes).map((registrationTid) =>
          this.getSummaryAndAttachments(reg, registrationTid, generateEmptySummaries)))
          .pipe(map((summaryAndAttachments) => this.mapToSummaryWithAttachments(registrationTypes, summaryAndAttachments)))
      ));
  }

  // public getRegistrationFormsWithRegistrationCards(reg: IRegistration, generateEmptySummaries = true): Observable<RegistrationCardWithAttachments[]> {
  //   return this.getRegistrationTidsForGeoHazard(reg.geoHazard).pipe(
  //     tap(tids => this.loggerService.debug('JOLO registrationTypes: ', { tids })),
  //     switchMap((registrationTypes) =>
  //       forkJoin(this.getRegistrationTids(registrationTypes)
  //         .map((registrationTid) => this.getRegistrationCardWithAttachments(reg, registrationTid, generateEmptySummaries)))
  //         .pipe(
  //           tap(tids => this.loggerService.debug('JOLO AFTER getRegistrationCardWithAttachments: ', { tids })),
  //           map((registrationCardsWithAttachments) => this.mapToRegistrationCardsWithAttachments(registrationTypes, registrationCardsWithAttachments)))
  //     ));
  // }

  private mapToSummaryWithAttachments(
    registrationTypes: IRegistrationType[],
    summaryAndAttachments: { registrationTid: RegistrationTid; summaries: Summary[]; attachments: ExistingOrNewAttachment[] }[]):
    SummaryWithAttachments[] {
    return (registrationTypes || []).map((regType) => {
      const summaryAndAttachmentsForRegType = summaryAndAttachments.find((s) => s.registrationTid === regType.registrationTid);
      const result: SummaryWithAttachments = {
        registrationTid: regType.registrationTid,
        name: regType.name,
        attachments: (summaryAndAttachmentsForRegType && summaryAndAttachmentsForRegType.attachments) ? summaryAndAttachmentsForRegType.attachments : undefined,
        summaries: (summaryAndAttachmentsForRegType && summaryAndAttachmentsForRegType.summaries) ? summaryAndAttachmentsForRegType.summaries : undefined,
        subTypes: this.mapToSummaryWithAttachments(regType.subTypes, summaryAndAttachments),
      };
      return result;
    });
  }

  // private mapToRegistrationCardsWithAttachments(
  //   registrationTypes: IRegistrationType[],
  //   registrationCardsWithAttachments: { registrationTid: RegistrationTid; registrationCards: RegistrationCard[]; attachments: ExistingOrNewAttachment[] }[]):
  //   RegistrationCardWithAttachments[] {
  //   return (registrationTypes || []).map((regType) => {
  //     const registrationCardAndAttachmentsForRegType = registrationCardsWithAttachments.find((s) => s.registrationTid === regType.registrationTid);
  //     const result: RegistrationCardWithAttachments = {
  //       registrationTid: regType.registrationTid,
  //       registrationName: regType.name,
  //       attachments: (registrationCardAndAttachmentsForRegType && registrationCardAndAttachmentsForRegType.attachments) ? registrationCardAndAttachmentsForRegType.attachments : undefined,
  //       registrationCards: (registrationCardAndAttachmentsForRegType && registrationCardAndAttachmentsForRegType.registrationCards) ? registrationCardAndAttachmentsForRegType.registrationCards : undefined,
  //     };
  //     return result;
  //   });
  // }

  private getRegistrationTids(registrationTypes: IRegistrationType[]): RegistrationTid[] {
    const result: RegistrationTid[] = [];
    for (const r of registrationTypes) {
      result.push(r.registrationTid);
      if (r.subTypes && r.subTypes.length > 0) {
        result.push(...this.getRegistrationTids(r.subTypes));
      }
    }
    return result;
  }

  public getRegistrationTidsForGeoHazard(geoHazard: GeoHazard): Observable<IRegistrationType[]> {
    return this.kdvService.getViewRepositoryByKeyObservable('RegistrationTypesV')
      .pipe(map((val) => this.parseViewRepositoryType(val[`${geoHazard}`])));
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

  public getRegistrationViewModelFormsWithSummaries(regViewModel: RegistrationViewModel, generateEmptySummaries = true): Observable<SummaryWithAttachments[]> {
    const reg: IRegistration = this.editExisingRegistration(regViewModel);
    return this.getRegistrationFormsWithSummaries(reg, generateEmptySummaries);
  }

  private getSummaryAndAttachments(reg: IRegistration, registrationTid: RegistrationTid, addIfEmpty = true) {
    return this.getSummaryForRegistrationTid(reg, registrationTid, addIfEmpty)
      .pipe(withLatestFrom(this.getAttachmentForRegistration(reg, registrationTid)),
        map(([summaries, attachments]) => ({ registrationTid, summaries, attachments })));
  }

  // private getRegistrationCardWithAttachments(reg: IRegistration, registrationTid: RegistrationTid, addIfEmpty = true) {
  //   return this.getRegistrationCardForRegistrationTid(reg, registrationTid, addIfEmpty)
  //     .pipe(withLatestFrom(this.getAttachmentForRegistration(reg, registrationTid)),
  //       map(([registrationCards, attachments]) => ({ registrationTid, registrationCards, attachments })));
  // }

  public getAttachmentForRegistration(reg: IRegistration, registrationTid: RegistrationTid): Observable<ExistingOrNewAttachment[]> {
    return this.addNewAttachmentService.getUploadedAttachments(reg.id).pipe(
      map((uploaded) =>
        [
          ...uploaded.filter((u) => u.RegistrationTID === registrationTid),
          ...(reg.syncStatus === SyncStatus.InSync ? this.getResponseAttachmentsForRegistrationTid(reg, registrationTid) : getAttachments(reg, registrationTid))
        ]
      ));
  }

  public getResponseAttachmentsForRegistrationTid(reg: IRegistration, registrationTid: RegistrationTid): AttachmentViewModel[] {
    if (!reg || !reg.response || !reg.response.Attachments) {
      return [];
    }
    return reg.response.Attachments.filter((a) => a.RegistrationTID === registrationTid);
  }

  private getRegistrationObservable(appMode: AppMode) {
    return this._inMemoryRegistrations.pipe(
      map((appModeReg) => appModeReg.filter((appModeReg) => appModeReg.appMode === appMode).map((appModeReg) => appModeReg.reg)));
  }

  private getNetworkOnlineObservable(): Observable<boolean> {
    return this.internetConnectivity.isOnline$.pipe(
      distinctUntilChanged(),
      filter((online) => online),
      tap(() => this.loggerService.debug('App is now online!'))
    );
  }

  private filterWhenProgressIsAllreadyRunning() {
    return (src: Observable<IRegistration[]>) =>
      src.pipe(withLatestFrom(this.progressService.syncProgress$),
        filter(([, syncProgress]) => !syncProgress.inProgress),
        map(([records]) => records));
  }

  private getRegistrationsToSyncObservable(debounceTimeMs = 0) {
    return this.registrationStorage$.pipe(
      take(1),
      switchMap((records) =>
        forkJoin(records.map((reg) => this.shouldSync(reg).pipe(map((shouldSync) => ({ reg, shouldSync })))))),
      map((result) => result.filter((result) => result.shouldSync).map((result) => result.reg)),
      debounceTime(debounceTimeMs));
  }

  private shouldSync(reg: IRegistration): Observable<boolean> {
    if (reg.syncStatus === SyncStatus.Sync) {
      if (this.shouldThrottle(reg)) {
        return of(false);
      }
      if (reg.response && reg.response.RegId > 0) {
        return of(true); // Edit existing registration should sync even if empty (deleted observation)
      }
      const notEmpty = hasAnyObservations(reg); // Only sync if any observations is added (not only obs location and time)
      if (notEmpty) {
        return of(true);
      }
      return this.addNewAttachmentService.getUploadedAttachments(reg.id).pipe(take(1), map((attachments) => attachments.length > 0));
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

  private updateRowAndReturnItem(): (src: Observable<ItemSyncCompleteStatus<IRegistration>>) =>
    Observable<IRegistration> {
    return (src: Observable<ItemSyncCompleteStatus<IRegistration>>) =>
      src.pipe(map((r: ItemSyncCompleteStatus<IRegistration>) => ({
        ...r.item,
        lastSync: moment().unix(),
        syncStatus: r.success ? SyncStatus.InSync : (r.statusCode === 0 ? SyncStatus.Sync : SyncStatus.Draft),
        syncStatusCode: r.statusCode,
        syncError: r.error,
      })),
      switchMap((item: IRegistration) =>
        this.saveRegistration(item, false)
          .pipe(catchError((err) => {
            this.loggerService.error('Could not update record in offline storage', err);
            return of([]);
          }), map(() => item)))
      );
  }
}
