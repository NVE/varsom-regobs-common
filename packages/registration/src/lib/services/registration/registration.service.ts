import { Injectable, Inject } from '@angular/core';
import { Observable, from, timer, BehaviorSubject, Subscription, of, EMPTY, concat, combineLatest } from 'rxjs';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { NSqlFullTableObservable, GeoHazard, AppMode, LoggerService, isEmpty } from '@varsom-regobs-common/core';
import { switchMap, shareReplay, map, tap, concatMap, catchError, debounceTime, skipWhile, mergeMap, toArray, take } from 'rxjs/operators';
import { uuid } from '@nano-sql/core/lib/utilities';
import { IRegistration } from '../../models/registration.interface';
import { OfflineDbService } from '../offline-db/offline-db.service';
import { SyncStatus } from '../../models/sync-status.enum';
import { SettingsService } from '../settings/settings.service';
import { SyncProgress } from '../../models/sync-progress';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { ItemSyncCallbackService } from '../item-sync-callback/item-sync-callback.service';
import moment from 'moment';
import { RegistrationTid } from '../../models/registration-tid.enum';
import { AttachmentEditModel, Summary } from '@varsom-regobs-common/regobs-api';
import { ValidRegistrationType } from '../../models/valid-registration.type';
import { SUMMARY_PROVIDER_TOKEN } from '../../registration.module';
import { ISummaryProvider } from '../summary-providers/summary-provider.interface';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  private _registrationStorage$: Observable<IRegistration[]>;
  private _syncProgress$: BehaviorSubject<SyncProgress>;
  private _registrationSyncSubscription: Subscription;

  public get registrationStorage$(): Observable<IRegistration[]> {
    return this._registrationStorage$;
  }

  public get syncProgress$(): Observable<SyncProgress> {
    return this._syncProgress$.asObservable();
  }

  constructor(
    private offlineDbService: OfflineDbService,
    private settingsService: SettingsService,
    private loggerService: LoggerService,
    @Inject('OfflineRegistrationSyncService') private offlineRegistrationSyncService: ItemSyncCallbackService<IRegistration>,
    @Inject(SUMMARY_PROVIDER_TOKEN) private summaryProviders: ISummaryProvider[],
  ) {
    this._syncProgress$ = new BehaviorSubject(new SyncProgress());
    this._registrationStorage$ = this.offlineDbService.appModeInitialized$.pipe(
      switchMap((appMode) => this.getRegistrationObservable(appMode)), shareReplay(1));
    this.cancelAndRestartSyncListener();
  }

  public saveRegistration(reg: IRegistration, updateChangedTimestamp = true) {
    if (updateChangedTimestamp) {
      reg.changed = moment().unix();
    }
    return this.offlineDbService.appModeInitialized$.pipe(concatMap((appMode) =>
      from(this.offlineDbService.getDbInstance(appMode).selectTable(TABLE_NAMES.REGISTRATION).query('upsert', reg).exec())),
    take(1) // Important. Completes observable.
    );
  }

  public deleteRegistration(id: string) {
    return this.offlineDbService.appModeInitialized$.pipe(concatMap((appMode) =>
      from(this.offlineDbService.getDbInstance(appMode)
        .selectTable(TABLE_NAMES.REGISTRATION).query('delete').where(['id', '=', id]).exec())),
    take(1) // Important. Completes observable.
    );
  }

  public cancelAndRestartSyncListener() {
    if (this._registrationSyncSubscription) {
      this._registrationSyncSubscription.unsubscribe();
    }
    this.resetSyncProgress();
    this._registrationSyncSubscription = this.createRegistrationSyncObservable().subscribe();
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
      },
    };
    return draft;
  }

  public getOrCreateNewRegistrationForm(reg: IRegistration, tid: RegistrationTid): ValidRegistrationType {
    if (this.isObservationEmptyForRegistrationTid(reg, tid)) {
      return this.isArrayType(tid) ? [] : {};
    }
    return this.getRegistationProperty(reg, tid);
  }

  /**
   * Converts a registration draft to summary as the same model as generated from the API
   * @param reg Registration draft
   * @param registrationTid Registration tid
   */
  public getDraftSummary(reg: IRegistration, registrationTid: RegistrationTid): Observable<Summary> {
    if (!this.isObservationEmptyForRegistrationTid(reg, registrationTid)) {
      const provider = this.summaryProviders.find((p) => p.registrationTid === registrationTid);
      if (provider) {
        return provider.generateSummary(reg);
      }
    }
    return of({});
  }

  public getDraftSummaries(reg: IRegistration) {
    return combineLatest(this.getRegistrationTidsForGeoHazard(reg.geoHazard)
      .map((tid) => this.getDraftSummary(reg, tid)));
  }

  /**
   * Returns true if Registration Tid is of Array type
   * @param tid RegistrationTid
   */
  public isArrayType(tid: RegistrationTid) {
    return [
      RegistrationTid.AvalancheActivityObs,
      RegistrationTid.AvalancheActivityObs2,
      RegistrationTid.AvalancheDangerObs,
      RegistrationTid.AvalancheEvalProblem2,
      RegistrationTid.CompressionTest,
      RegistrationTid.DangerObs,
      RegistrationTid.Picture,
      RegistrationTid.DamageObs
    ].indexOf(tid) >= 0;
  }

  /**
   * Get valid registration Tids (types) for given GeoHazard
   * @param geoHazard GeoHazard
   */
  public getRegistrationTidsForGeoHazard(geoHazard: GeoHazard): RegistrationTid[] {
    const goHazardTids = new Map<GeoHazard, Array<RegistrationTid>>([
      [GeoHazard.Snow, [
        RegistrationTid.DangerObs,
        RegistrationTid.AvalancheObs,
        RegistrationTid.AvalancheActivityObs2,
        RegistrationTid.WeatherObservation,
        RegistrationTid.SnowSurfaceObservation,
        RegistrationTid.CompressionTest,
        RegistrationTid.SnowProfile2,
        RegistrationTid.AvalancheEvalProblem2,
        RegistrationTid.AvalancheEvaluation3
      ]],
      [GeoHazard.Ice, [RegistrationTid.IceCoverObs, RegistrationTid.IceThickness, RegistrationTid.DangerObs, RegistrationTid.Incident]],
      [GeoHazard.Water, [RegistrationTid.WaterLevel2, RegistrationTid.DamageObs]],
      [GeoHazard.Soil, [RegistrationTid.DangerObs, RegistrationTid.LandSlideObs]]
    ]);
    const generalObs = [RegistrationTid.GeneralObservation];
    return goHazardTids.get(geoHazard).concat(generalObs);
  }

  private getRegistrationObservable(appMode: AppMode) {
    this.loggerService.log('get registration observable. Db instance is: ', appMode);
    return new NSqlFullTableObservable<IRegistration[]>(
      this.offlineDbService.getDbInstance(appMode).selectTable(TABLE_NAMES.REGISTRATION).query('select').listen()
    );
  }

  private resetSyncProgress(records?: IRegistration[]) {
    const progress = new SyncProgress();
    if (records !== undefined) {
      this.loggerService.log('Records to sync: ', records);
      progress.start(records.map((r) => r.id));
    }
    this._syncProgress$.next(progress);
  }

  private setSyncProgress(item: ItemSyncCompleteStatus<IRegistration>) {
    this.loggerService.log('Sync record item complete', item);
    const progress = this._syncProgress$.value;
    if (item.success) {
      progress.setRecordComplete(item.item.id);
    } else {
      progress.setRecordError(item.item.id, item.error);
    }
    this._syncProgress$.next(progress);
  }

  private createRegistrationSyncObservable() {
    return this.getRegistrationsToSyncObservable().pipe(switchMap((records) =>
      timer(0, 60 * 1000).pipe(map(() => records))),
    skipWhile(() => this._syncProgress$.value.inProgress),
    tap((records) => this.resetSyncProgress(records)),
    this.flattenRegistrationsToSync(),
    concatMap((row) => of(this.setSyncProgress(row)).pipe(map(() => row))),
    this.updateRowAndReturnItem(),
    toArray(),
    catchError((error) => {
      this.loggerService.warn('Could not sync registrations', error);
      return EMPTY;
    }),
    tap(() => this.resetSyncProgress())
    );
  }

  private getRegistrationsToSyncObservable() {
    return this.settingsService.registrationSettings$.pipe(
      switchMap((settings) => this.registrationStorage$.pipe(map((records) =>
        records.filter((row) => this.shouldSync(row, settings.autoSync))
      ), debounceTime(5000))));
  }

  private shouldSync(reg: IRegistration, autoSync: boolean) {
    if (reg.syncStatus === SyncStatus.Sync || (autoSync === true && reg.syncStatus === SyncStatus.Draft)) {
      if (reg.regId !== undefined && reg.regId !== null) {
        return true; // Edit existing registration should sync even if empty (deleted observation)
      }
      return this.hasAnyObservations(reg); // Only sync if any observations is added (not only obs location and time)
    }
    return false;
  }

  private hasAnyObservations(reg: IRegistration) {
    if (reg === undefined || reg === null) {
      return false;
    }
    const registrationTids = this.getRegistrationTids();
    return registrationTids.some((x) => !this.isObservationEmptyForRegistrationTid(reg, x));
  }

  public getRegistrationTids(): RegistrationTid[] {
    return Object.keys(RegistrationTid)
      .map((key) => RegistrationTid[key]).filter((val: RegistrationTid) => typeof (val) !== 'string');
  }

  public isObservationEmptyForRegistrationTid(reg: IRegistration, registrationTid: number) {
    if (reg && registrationTid) {
      const hasRegistration = !isEmpty(this.getRegistationProperty(reg, registrationTid));
      const hasImages = this.hasImages(reg, registrationTid);
      if (hasRegistration || hasImages) {
        return false;
      }
    }
    return true;
  }

  public getRegistationProperty(reg: IRegistration, registrationTid: RegistrationTid): ValidRegistrationType {
    if (reg && reg.request && registrationTid) {
      return reg.request[this.getPropertyName(registrationTid)];
    }
    return null;
  }

  public getPropertyName(registrationTid: RegistrationTid) {
    return RegistrationTid[registrationTid];
  }

  public hasImages(reg: IRegistration, registrationTid: RegistrationTid) {
    return this.getImages(reg, registrationTid).length > 0;
  }

  public getImages(reg: IRegistration, registrationTid: RegistrationTid): AttachmentEditModel[] {
    if (!reg) {
      return [];
    }
    const pictures = (reg.request.Attachments || []).filter((p) => p.RegistrationTID === registrationTid);
    if (registrationTid === RegistrationTid.DamageObs) {
      for (const damageObs of (reg.request.DamageObs || [])) {
        pictures.push(...(damageObs.Attachments || []));
      }
    }
    return pictures;
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
      src.pipe(map((r) => ({
        ...r.item,
        lastSync: moment().unix(),
        syncStatus: r.success ? SyncStatus.InSync : r.item.syncStatus,
        syncError: r.error,
      })),
      concatMap((item) =>
        this.saveRegistration(item, false)
          .pipe(catchError((err) => {
            this.loggerService.error('Could not update record in offline storage', err);
            return of([]);
          }), map(() => item)))
      );
  }
}
