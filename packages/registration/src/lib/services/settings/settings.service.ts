import { Injectable } from '@angular/core';
import { OfflineDbService } from '../offline-db/offline-db.service';
import { IRegistrationSettings } from '../../models/registration-settings.interface';
import { Observable, from } from 'rxjs';
import { switchMap, map, shareReplay, concatMap, take } from 'rxjs/operators';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { InanoSQLInstance } from '@nano-sql/core';
import { NSqlFullTableObservable } from '@varsom-regobs-common/core';

const SETTINGS_ROW_ID = 'registration_settings';
const DEFAULT_SETTINGS = { autoSync: true };

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private _registrationSettings$: Observable<IRegistrationSettings>;

  public get registrationSettings$(): Observable<IRegistrationSettings> {
    return this._registrationSettings$;
  }

  constructor(private offlineDbService: OfflineDbService) {
    this._registrationSettings$ = this.offlineDbService.appModeInitialized$.pipe(
      switchMap((dbConnected) => this.getRegistrationSettingsObservable(dbConnected.dbInstance)), shareReplay(1));
  }

  public saveSettings(settings: IRegistrationSettings) {
    return this.offlineDbService.appModeInitialized$.pipe(concatMap((dbInit) =>
      from(dbInit.dbInstance.selectTable(TABLE_NAMES.USER_SETTINGS).query('upsert', { id: SETTINGS_ROW_ID, ...settings }).exec())),
      take(1)); // Completes observable
  }

  private getRegistrationSettingsObservable(dbInstance: InanoSQLInstance): Observable<IRegistrationSettings> {
    return new NSqlFullTableObservable<IRegistrationSettings[]>(
      dbInstance.selectTable(TABLE_NAMES.USER_SETTINGS).query('select').listen()
    ).pipe((map((rows) => (rows[0] || DEFAULT_SETTINGS))));
  }
}
