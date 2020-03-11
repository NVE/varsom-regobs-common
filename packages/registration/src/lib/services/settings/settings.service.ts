// import { Injectable } from '@angular/core';
// import { OfflineDbService } from '../offline-db/offline-db.service';
// import { IRegistrationSettings } from '../../models/registration-settings.interface';
// import { Observable, from } from 'rxjs';
// import { switchMap, map, shareReplay, concatMap } from 'rxjs/operators';
// import { TABLE_NAMES } from '../../db/nSQL-db.config';
// import { NSqlFullTableObservable, AppMode } from '@varsom-regobs-common/core';

// const SETTINGS_ROW_ID = 'registration_settings';
// const DEFAULT_SETTINGS = { autoSync: true };

// @Injectable({
//   providedIn: 'root'
// })
// export class SettingsService {

//   private _registrationSettings$: Observable<IRegistrationSettings>;

//   public get registrationSettings$(): Observable<IRegistrationSettings> {
//     return this._registrationSettings$;
//   }

//   constructor(private offlineDbService: OfflineDbService) {
//     this._registrationSettings$ = this.offlineDbService.appModeInitialized$.pipe(
//       switchMap((appMode) => this.getRegistrationSettingsObservable(appMode)), shareReplay(1));
//   }

//   public saveSettings(settings: IRegistrationSettings) {
//     return this.offlineDbService.appModeInitialized$.pipe(concatMap((appMode) =>
//       from(this.offlineDbService.getDbInstance(appMode)
//         .selectTable(TABLE_NAMES.USER_SETTINGS).query('upsert', { id: SETTINGS_ROW_ID, ...settings }).exec())));
//   }

//   private getRegistrationSettingsObservable(appMode: AppMode): Observable<IRegistrationSettings> {
//     return new NSqlFullTableObservable<IRegistrationSettings[]>(
//       this.offlineDbService.getDbInstance(appMode).selectTable(TABLE_NAMES.USER_SETTINGS).query('select').listen()
//     ).pipe((map((rows) => (rows[0] || DEFAULT_SETTINGS))));
//   }
// }
