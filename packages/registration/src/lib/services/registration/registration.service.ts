import { Injectable } from '@angular/core';
import { Observable, from, timer } from 'rxjs';
import { nSQL } from '@nano-sql/core';
import { CreateRegistrationRequestDto } from '@varsom-regobs-common/regobs-api';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { NSqlFullTableObservable } from '@varsom-regobs-common/core';
import { switchMap, shareReplay, map, tap } from 'rxjs/operators';
import { uuid } from '@nano-sql/core/lib/utilities';
import { IRegistration } from '../../models/registration.interface';
import { OfflineDbService } from '../offline-db/offline-db.service';
import * as momentImported from 'moment';
import { SyncStatus } from '../../models/sync-status.enum';
import { SettingsService } from '../settings/settings.service';
const moment = momentImported;

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  private _registrationStorage$: Observable<IRegistration[]>;

  public get registrationStorage$(): Observable<IRegistration[]> {
    return this._registrationStorage$;
  }

  constructor(private offlineDbService: OfflineDbService, private settingsService: SettingsService) {
    this._registrationStorage$ = this.offlineDbService.appModeInitialized$.pipe(
      switchMap(() => this.getRegistrationObservable()), shareReplay(1));
    this.createRegistrationSyncObservable().subscribe();
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

  private getRegistrationObservable() {
    return new NSqlFullTableObservable<IRegistration[]>(
      nSQL(TABLE_NAMES.REGISTRATION).query('select').listen()
    );
  }

  private createRegistrationSyncObservable() {
    return this.getRegistrationsToSyncObservable().pipe(switchMap((records) =>
      timer(0, 60 * 1000).pipe(map(() => records))),
      tap((records) => console.log('Records to sync: ', records)));
  }

  private getRegistrationsToSyncObservable() {
    return this.settingsService.registrationSettings$.pipe(
      switchMap((settings) => this.registrationStorage$.pipe(map((records) =>
        records.filter((row) => row.syncStatus === SyncStatus.Sync
          || (settings.autoSync === true && row.syncStatus === SyncStatus.Draft))
      ))));
  }
}
