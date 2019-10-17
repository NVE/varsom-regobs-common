import { Injectable } from '@angular/core';
import { OfflineDbService } from '../offline-db/offline-db.service';
import { IRegistrationSettings } from '../../models/registration-settings.interface';
import { Observable } from 'rxjs';
import { switchMap, map, shareReplay } from 'rxjs/operators';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { nSQL } from '@nano-sql/core';
import { NSqlFullTableObservable } from '@varsom-regobs-common/core';

const SETTINGS_ROW_ID = 'registration_settings';
const DEFAULT_SETTINGS = { autoSync: true };

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  public get registrationSettings$(): Observable<IRegistrationSettings> {
    return this.offlineDbService.appModeInitialized$.pipe(
      switchMap(() => this.getRegistrationSettingsObservable()), shareReplay(1));
  }

  constructor(private offlineDbService: OfflineDbService) {

  }

  public saveSettings(settings: IRegistrationSettings): Promise<any> {
    return nSQL(TABLE_NAMES.USER_SETTINGS).query('upsert', { id: SETTINGS_ROW_ID, ...settings }).exec();
  }

  private getRegistrationSettingsObservable(): Observable<IRegistrationSettings> {
    return new NSqlFullTableObservable<IRegistrationSettings[]>(
      nSQL(TABLE_NAMES.USER_SETTINGS).query('select').listen()
    ).pipe((map((rows) => (rows[0] || DEFAULT_SETTINGS))));
  }
}
