import { Injectable } from '@angular/core';
import { OfflineDbService } from '../offline-db/offline-db.service';
import { IRegistrationSettings } from '../../models/registration-settings.interface';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { nSQL } from '@nano-sql/core';
import { NSqlFullTableObservable } from '@varsom-regobs-common/core';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  public get registrationStorage$(): Observable<IRegistrationSettings[]> {
    return this.offlineDbService.appModeInitialized$.pipe(
      switchMap(() => this.getRegistrationSettingsObservable()));
  }

  constructor(private offlineDbService: OfflineDbService) { }

  private getRegistrationSettingsObservable() {
    return new NSqlFullTableObservable<IRegistrationSettings[]>(
      nSQL(TABLE_NAMES.USER_SETTINGS).query('select').listen()
    );
  }
}
