import { Injectable, Inject } from '@angular/core';
import { Observable, from, timer, BehaviorSubject, Subscription, of, EMPTY, concat } from 'rxjs';
import { nSQL, InanoSQLInstance } from '@nano-sql/core';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { NSqlFullTableObservable, GeoHazard } from '@varsom-regobs-common/core';
import { switchMap, shareReplay, map, tap, concatMap, catchError, debounceTime, skipWhile, mergeMap, toArray, take } from 'rxjs/operators';
import { uuid } from '@nano-sql/core/lib/utilities';
import { IRegistration } from '../../models/registration.interface';
import { OfflineDbService } from '../offline-db/offline-db.service';
import * as momentImported from 'moment';
import { SyncStatus } from '../../models/sync-status.enum';
import { SettingsService } from '../settings/settings.service';
import { SyncProgress } from '../../models/sync-progress';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { ItemSyncCallbackService } from '../item-sync-callback/item-sync-callback.service';
const moment = momentImported;

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
    @Inject('OfflineRegistrationSyncService') private offlineRegistrationSyncService: ItemSyncCallbackService<IRegistration>) {
    this._syncProgress$ = new BehaviorSubject(new SyncProgress());
    this._registrationStorage$ = this.offlineDbService.appModeInitialized$.pipe(
      switchMap((dbInit) => this.getRegistrationObservable(dbInit.dbInstance)), shareReplay(1));
    this.cancelAndRestartSyncListener();
  }

  public saveRegistration(reg: IRegistration, updateChangedTimestamp = true) {
    if (updateChangedTimestamp) {
      reg.changed = moment().unix();
    }
    return this.offlineDbService.appModeInitialized$.pipe(concatMap((dbInit) =>
      from(dbInit.dbInstance.selectTable(TABLE_NAMES.REGISTRATION).query('upsert', reg).exec())),
      take(1) // Important. Completes observable.
    );
  }

  public deleteRegistration(id: string) {
    return this.offlineDbService.appModeInitialized$.pipe(concatMap((dbInit) =>
      from(dbInit.dbInstance.selectTable(TABLE_NAMES.REGISTRATION).query('delete').where(['id', '=', id]).exec())),
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
        Id: id,
        GeoHazardTID: geoHazard,
        ObserverGuid: undefined,
        DtObsTime: undefined,
        ObsLocation: {
        },
      },
    };
    return draft;
  }

  private getRegistrationObservable(dbInstance: InanoSQLInstance) {
    console.log('get registration observable. Db instance is: ', dbInstance);
    return new NSqlFullTableObservable<IRegistration[]>(
      dbInstance.selectTable(TABLE_NAMES.REGISTRATION).query('select').listen()
    );
  }

  private resetSyncProgress(records?: IRegistration[]) {
    const progress = new SyncProgress();
    if (records !== undefined) {
      console.log('Records to sync: ', records);
      progress.start(records.map((r) => r.id));
    }
    this._syncProgress$.next(progress);
  }

  private setSyncProgress(item: ItemSyncCompleteStatus<IRegistration>) {
    console.log('Sync record item complete', item);
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
        console.log('Could not sync registrations', error);
        return EMPTY;
      }),
      tap((t) => this.resetSyncProgress())
    );
  }

  private getRegistrationsToSyncObservable() {
    return this.settingsService.registrationSettings$.pipe(
      switchMap((settings) => this.registrationStorage$.pipe(map((records) =>
        records.filter((row) => row.syncStatus === SyncStatus.Sync
          || (settings.autoSync === true && row.syncStatus === SyncStatus.Draft))
      ), debounceTime(5000))));
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
      tap((result) => console.log('Record sync complete', result)));
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
              console.log('Could not update record in offline storage', err);
              return of([]);
            }), map(() => item)))
      );
  }
}
