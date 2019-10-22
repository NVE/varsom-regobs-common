import { Injectable, Inject } from '@angular/core';
import { Observable, from, timer, BehaviorSubject, Subscription, of, EMPTY } from 'rxjs';
import { nSQL } from '@nano-sql/core';
import { CreateRegistrationRequestDto } from '@varsom-regobs-common/regobs-api';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { NSqlFullTableObservable } from '@varsom-regobs-common/core';
import { switchMap, shareReplay, map, tap, concatMap, catchError, debounceTime, skipWhile, mergeMap, toArray } from 'rxjs/operators';
import { uuid } from '@nano-sql/core/lib/utilities';
import { IRegistration } from '../../models/registration.interface';
import { OfflineDbService } from '../offline-db/offline-db.service';
import * as momentImported from 'moment';
import { SyncStatus } from '../../models/sync-status.enum';
import { SettingsService } from '../settings/settings.service';
import { OfflineSyncService } from '../offline-sync/offline-sync.service';
import { SyncProgress } from '../../models/sync-progress';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
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
    @Inject('OfflineRegistrationSyncService') private offlineRegistrationSyncService: OfflineSyncService<IRegistration>) {
    this._syncProgress$ = new BehaviorSubject(new SyncProgress());
    this._registrationStorage$ = this.offlineDbService.appModeInitialized$.pipe(
      switchMap(() => this.getRegistrationObservable()), shareReplay(1));
    this.cancelAndRestartSyncListener();
  }

  public addRegistration(reg: CreateRegistrationRequestDto): Observable<any> {
    if (!reg.Id) {
      reg.Id = uuid();
    }
    const dbRecord: IRegistration = {
      id: reg.Id,
      changed: moment().unix(),
      syncStatus: SyncStatus.Draft,
      lastSync: null,
      request: reg
    };
    return from(nSQL(TABLE_NAMES.REGISTRATION).query('upsert', dbRecord).exec());
  }

  public deleteRegistration(id: string): Observable<any> {
    return from(nSQL(TABLE_NAMES.REGISTRATION).query('delete').where(['id', '=', id]).exec());
  }

  public cancelAndRestartSyncListener() {
    if (this._registrationSyncSubscription) {
      this._registrationSyncSubscription.unsubscribe();
    }
    this.resetSyncProgress();
    this._registrationSyncSubscription = this.createRegistrationSyncObservable().subscribe();
  }

  private getRegistrationObservable() {
    return new NSqlFullTableObservable<IRegistration[]>(
      nSQL(TABLE_NAMES.REGISTRATION).query('select').listen()
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

  private updateRow(row: IRegistration) {
    return from(nSQL(TABLE_NAMES.REGISTRATION).query('upsert', row).exec());
  }

  private createRegistrationSyncObservable() {
    return this.getRegistrationsToSyncObservable().pipe(switchMap((records) =>
      timer(0, 60 * 1000).pipe(map(() => records))),
      skipWhile(() => this._syncProgress$.value.inProgress),
      tap((records) => this.resetSyncProgress(records)),
      this.offlineRegistrationSyncService.syncOfflineRecords(),
      concatMap((row) => of(this.setSyncProgress(row)).pipe(map(() => row))),
      map((r) => ({
        ...r.item,
        lastSync: moment().unix(),
        syncStatus: r.success ? SyncStatus.InSync : r.item.syncStatus,
        syncError: r.error,
      })),
      concatMap((row) => this.updateRow(row).pipe(map(() => row))),
      toArray(),
      // concatMap((rows) => from(nSQL(TABLE_NAMES.REGISTRATION).query('upsert', rows).exec())),
      catchError((error) => {
        console.log('Could not sync registrations', error);
        return of([]);
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
}
