import { Injectable, Inject } from '@angular/core';
import { Observable, from, Subscription, of, concat, combineLatest } from 'rxjs';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { NSqlFullTableObservable, GeoHazard, AppMode, LoggerService } from '@varsom-regobs-common/core';
import { switchMap, shareReplay, map, tap, catchError, debounceTime, mergeMap, toArray, take, filter, withLatestFrom, distinctUntilChanged } from 'rxjs/operators';
import { uuid } from '@nano-sql/core/lib/utilities';
import { IRegistration } from '../../models/registration.interface';
import { OfflineDbService } from '../offline-db/offline-db.service';
import { SyncStatus } from '../../models/sync-status.enum';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { ItemSyncCallbackService } from '../item-sync-callback/item-sync-callback.service';
import moment from 'moment';
import { RegistrationTid } from '../../models/registration-tid.enum';
import { Summary, AttachmentViewModel, RegistrationViewModel } from '@varsom-regobs-common/regobs-api';
import { SUMMARY_PROVIDER_TOKEN, IRegistrationModuleOptions, FOR_ROOT_OPTIONS_TOKEN } from '../../registration.module';
import { ISummaryProvider } from '../summary-providers/summary-provider.interface';
import { hasAnyObservations, isObservationEmptyForRegistrationTid, getRegistrationTidsForGeoHazard, getAttachments } from '../../registration.helpers';
import { ProgressService } from '../progress/progress.service';
import { InternetConnectivity } from 'ngx-connectivity';
import { KdvService } from '../kdv/kdv.service';
import { AttachmentUploadEditModel } from '../../registration.models';
import { ExistingOrNewAttachment } from '../../models/attachment-upload-edit.interface';
import { SummaryWithAttachments } from '../../models/summary/summary-with-attachments';
import cloneDeep from 'clone-deep';

const SYNC_BUFFER_MS = 60 * 1000; // 60 seconds
const SYNC_DEBOUNCE_TIME_MS = 200;

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  private _registrationStorage$: Observable<IRegistration[]>;
  private _registrationSyncSubscription: Subscription;

  public get registrationStorage$(): Observable<IRegistration[]> {
    return this._registrationStorage$;
  }

  constructor(
    private offlineDbService: OfflineDbService,
    // private settingsService: SettingsService,
    private loggerService: LoggerService,
    private progressService: ProgressService,
    private kdvService: KdvService,
    private internetConnectivity: InternetConnectivity,
    @Inject('OfflineRegistrationSyncService') private offlineRegistrationSyncService: ItemSyncCallbackService<IRegistration>,
    @Inject(SUMMARY_PROVIDER_TOKEN) private summaryProviders: ISummaryProvider[],
    @Inject(FOR_ROOT_OPTIONS_TOKEN) private options: IRegistrationModuleOptions
  ) {
    this._registrationStorage$ = this.offlineDbService.appModeInitialized$.pipe(
      switchMap((appMode) => this.getRegistrationObservable(appMode)), shareReplay(1));
    this.cancelSync();
  }

  public saveRegistration(reg: IRegistration, updateChangedTimestamp = true) {
    if (updateChangedTimestamp) {
      reg.changed = moment().unix();
    }
    return this.offlineDbService.appModeInitialized$.pipe(switchMap((appMode) =>
      from(this.offlineDbService.getDbInstance(appMode).selectTable(TABLE_NAMES.REGISTRATION).query('upsert', reg).exec()))
    );
  }

  public deleteRegistration(id: string) {
    return this.offlineDbService.appModeInitialized$.pipe(switchMap((appMode) =>
      from(this.offlineDbService.getDbInstance(appMode)
        .selectTable(TABLE_NAMES.REGISTRATION).query('delete').where(['id', '=', id]).exec()))
    );
  }

  public cancelSync() {
    this.progressService.resetSyncProgress();
    if (this._registrationSyncSubscription) {
      this._registrationSyncSubscription.unsubscribe();
    }
    if (this.options.autoSync) {
      this._registrationSyncSubscription = this.getAutoSyncObservable().subscribe();
    }
  }

  public getFirstDraftForGeoHazard(geoHazard: GeoHazard) {
    return this.getDraftsForGeoHazardObservable(geoHazard)
      .pipe(map((rows) => rows[0]), take(1)).toPromise();
  }

  public getDraftsForGeoHazardObservable(geoHazard: GeoHazard) {
    return this.registrationStorage$.pipe(map((records) =>
      records.filter((reg) =>
        reg.request.GeoHazardTID === geoHazard &&
        reg.syncStatus === SyncStatus.Draft
      )));
  }

  public createNewEmptyDraft(geoHazard: GeoHazard) {
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

  public editExisingRegistration(registrationViewModel: RegistrationViewModel, syncStatus: SyncStatus = SyncStatus.Draft): IRegistration {
    const reg = this.createNewEmptyDraft(registrationViewModel.GeoHazardTID);
    reg.request = cloneDeep(registrationViewModel);
    reg.response = cloneDeep(registrationViewModel);
    reg.syncStatus = syncStatus;
    return reg;
  }

  public makeExistingRegistrationEditable(reg: IRegistration) {
    if(reg && reg.syncStatus === SyncStatus.InSync) {
      reg.request = cloneDeep(reg.response);
    }
  }

  public syncRegistrations() {
    return this.getRegistrationsToSyncObservable().pipe(this.resetProgressAndSyncItems());
  }

  public syncSingleRegistration(reg: IRegistration): Observable<boolean> {
    if (!reg) {
      return of(false);
    }
    return of([reg]).pipe(this.resetProgressAndSyncItems(), map((result) => result.length > 0 && !result[0].syncError));
  }

  private getAutoSyncObservable() {
    return this.getRegistrationsChangesOrWhenNetworkChange(SYNC_DEBOUNCE_TIME_MS).pipe(
      this.filterWhenProgressIsAllreadyRunning(),
      this.resetProgressAndSyncItems()
    );
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
      const provider = this.summaryProviders.find((p) => p.registrationTid === registrationTid);
      if (provider) {
        return provider.generateSummary(reg);
      }
    }
    return addIfEmpty ? this.generateEmptySummary(registrationTid) : of(null);
  }

  public getSummaryForRegistrationTid(reg: IRegistration, registrationTid: RegistrationTid, addIfEmpty = true): Observable<Summary[]> {
    return (reg.syncStatus === SyncStatus.InSync) ?
      this.getResponseSummaryForRegistrationTid(reg, registrationTid, addIfEmpty)
      : this.getDraftSummary(reg, registrationTid, addIfEmpty);
  }

  private getRegistrationName(registrationTid: RegistrationTid): Observable<string> {
    return this.kdvService.getKdvRepositoryByKeyObservable('RegistrationKDV').pipe(
      map((kdvElements) => kdvElements.find((kdv) => kdv.Id === registrationTid)), map((val) => val ? val.Name : ''));
  }

  private getResponseSummaryForRegistrationTid(reg: IRegistration, registrationTid: RegistrationTid, addIfEmpty = true): Observable<Summary[]> {
    if(reg && reg.response && reg.response.Summaries && reg.response.Summaries.length > 0) {
      const summary = reg.response.Summaries.filter(x => x.RegistrationTID === registrationTid);
      if(summary) {
        return of(summary);
      }
    }
    return addIfEmpty ? this.generateEmptySummary(registrationTid) : of(null);
  }

  private generateEmptySummary(registrationTid: RegistrationTid): Observable<Summary> {
    return this.getRegistrationName(registrationTid).pipe(map((registrationName) => ({
      RegistrationTID: registrationTid,
      RegistrationName: registrationName,
      Summaries: []  })));
  }

  // public getDraftSummaries(reg: IRegistration): Observable<Summary[][]> {
  //   return combineLatest(getRegistrationTidsForGeoHazard(reg.geoHazard)
  //     .map((tid) => this.getDraftSummary(reg, tid)));
  // }

  public getRegistrationEditFromsWithSummaries(id: string): Observable<{reg: IRegistration; forms: SummaryWithAttachments[]}> {
    return this.registrationStorage$.pipe(
      map((registrations) => registrations.find((r) => r.id === id)),
      filter((val) => !!val),
      switchMap((reg) => this.getRegistrationFormsWithSummaries(reg, true).pipe(map((forms) => ({
        reg,
        forms
      })))));
  }

  public getRegistrationFormsWithSummaries(reg: IRegistration, generateEmptySummaries = true): Observable<SummaryWithAttachments[]> {
    return combineLatest(getRegistrationTidsForGeoHazard(reg.geoHazard)
      .map((tid) => this.getSummaryAndAttachments(reg, tid, generateEmptySummaries)));
  }

  public getRegistrationViewModelFormsWithSummaries(regViewModel: RegistrationViewModel, generateEmptySummaries = true): Observable<SummaryWithAttachments[]> {
    const reg: IRegistration = this.editExisingRegistration(regViewModel, SyncStatus.InSync);
    return this.getRegistrationFormsWithSummaries(reg, generateEmptySummaries);
  }

  private getSummaryAndAttachments(reg: IRegistration, registrationTid: RegistrationTid, addIfEmpty = true): Observable<SummaryWithAttachments> {
    return combineLatest([
      this.getSummaryForRegistrationTid(reg, registrationTid, addIfEmpty),
      this.getRegistrationName(registrationTid),
      of(this.getAttachmentForRegistration(reg, registrationTid))
    ]).pipe(map(([summaries, registrationName, attachments]) => ({ registrationTid, registrationName, summaries, attachments  })));
  }

  public getAttachmentForRegistration(reg: IRegistration, registrationTid: RegistrationTid): ExistingOrNewAttachment[] {
    return (reg.syncStatus === SyncStatus.InSync) ?
      this.getResponseAttachmentsForRegistrationTid(reg, registrationTid) : this.getDraftAttachmentsForTid(reg, registrationTid);
  }

  public getResponseAttachmentsForRegistrationTid(reg: IRegistration, registrationTid: RegistrationTid): AttachmentViewModel[] {
    if(!reg || !reg.response || !reg.response.Attachments) {
      return [];
    }
    return reg.response.Attachments.filter((a) => a.RegistrationTID === registrationTid);
  }

  private getDraftAttachmentsForTid(reg: IRegistration, tid: RegistrationTid) {
    const attachments = getAttachments(reg, tid).map((a: AttachmentUploadEditModel) => {
      if(a.fileUrl) {
        return a;
      }
      return a as AttachmentViewModel; // Not changed, the attachment is still view model
    });
    return attachments;
  }

  private getRegistrationObservable(appMode: AppMode) {
    this.loggerService.debug('get registration observable. Db instance is: ', appMode);
    return new NSqlFullTableObservable<IRegistration[]>(
      this.offlineDbService.getDbInstance(appMode).selectTable(TABLE_NAMES.REGISTRATION).query('select').listen()
      //TODO: Do no listen for changes, use behaviour subject instead. Bad performance on mobile app...
    );
  }

  private getRegistrationsChangesOrWhenNetworkChange(debounceTimeMs = 0) {
    return combineLatest([this.getRegistrationsToSyncObservable(debounceTimeMs), this.getNetworkOnlineObservable()])
      .pipe(map(([records]) => records));
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
    return this.registrationStorage$.pipe(map((records) =>
      records.filter((row) => this.shouldSync(row))
    ), debounceTime(debounceTimeMs));
  }

  private shouldSync(reg: IRegistration) {
    if (reg.syncStatus === SyncStatus.Sync) {
      if (this.shouldThrottle(reg)) {
        return false;
      }
      if (reg.response && reg.response.RegId > 0) {
        return true; // Edit existing registration should sync even if empty (deleted observation)
      }
      return hasAnyObservations(reg); // Only sync if any observations is added (not only obs location and time)
    }
    return false;
  }

  private shouldThrottle(reg: IRegistration) {
    if (!reg.lastSync) {
      return false;
    }
    if(reg.changed > reg.lastSync) {
      return false;
    }
    const msSinceLastSync = moment().unix() - reg.lastSync;
    const lastSyncLessThanSyncBuffer = msSinceLastSync < SYNC_BUFFER_MS;
    this.loggerService.debug(`MS since last sync attempt: ${msSinceLastSync}. Should wait for sync: ${lastSyncLessThanSyncBuffer}`, reg);
    return lastSyncLessThanSyncBuffer;
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
        syncStatus: r.success ? SyncStatus.InSync : r.item.syncStatus,
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
