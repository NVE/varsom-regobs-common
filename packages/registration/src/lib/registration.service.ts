import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { nSQL } from '@nano-sql/core';
import { CreateRegistrationRequestDto } from '@varsom-regobs-common/regobs-api';
import { tables, TABLE_NAMES, DB_NAME_TEMPLATE } from './db_config';
import { AppMode, AppModeService, NSqlFullTableObservable } from '@varsom-regobs-common/core';
import { switchMap, tap } from 'rxjs/operators';
import { uuid } from '@nano-sql/core/lib/utilities';
import { InanoSQLTable, InanoSQLQuery } from '@nano-sql/core/lib/interfaces';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  private appModeInitStates = new Map<AppMode, boolean>();

  public get registrationStorage$(): Observable<{ id: string, reg: CreateRegistrationRequestDto }[]> {
    return this.appModeInitialized$.pipe(
      tap((appMode) => console.log('App mode initialized: ', appMode)),
      switchMap(() => this.getRegistrationObservable()));
  }

  public get appModeInitialized$(): Observable<AppMode> {
    return this.appModeService.appMode$.pipe(
      switchMap((appMode) => from(this.initAppMode(appMode))));
  }

  constructor(private appModeService: AppModeService) { }

  public addRegistration(reg: CreateRegistrationRequestDto): Observable<any> {
    if (!reg.Id) {
      reg.Id = uuid();
    }
    const dbRecord = { id: reg.Id, reg };
    return from(nSQL(TABLE_NAMES.REGISTRATION).query('upsert', dbRecord).exec());
  }

  public deleteRegistration(id: string): Observable<any> {
    return from(nSQL(TABLE_NAMES.REGISTRATION).query('delete').where(['id', '=', id]).exec());
  }

  private getRegistrationObservable() {
    return new NSqlFullTableObservable<{ id: string, reg: CreateRegistrationRequestDto }[]>(
      nSQL(TABLE_NAMES.REGISTRATION).query('select').listen()
    );
  }

  private getDbName(appMode: AppMode): string {
    return `${DB_NAME_TEMPLATE}_${appMode}`;
  }

  private async initAppMode(appMode: AppMode): Promise<AppMode> {
    const appModeInitialized = this.appModeInitStates.get(appMode);
    console.log('currentState is', appModeInitialized);
    if (!appModeInitialized) {
      console.log('createDatabase for app mode: ', appMode);
      await nSQL().createDatabase({
        id: this.getDbName(appMode),
        mode: 'PERM',
        tables: tables,
        plugins: [
          {
            name: 'Table Name Plugin', // Plugin to avoid random id on table name
            version: 1.0,
            dependencies: {},
            filters: [
              {
                name: 'configTableSystem',
                priority: 1000,
                call: (inputArgs: { res: InanoSQLTable, query: InanoSQLQuery }, complete, cancel) => {
                  inputArgs.res.id = inputArgs.res.name;
                  complete(inputArgs);
                }
              }
            ]
          },
        ],
      });
      this.appModeInitStates = this.appModeInitStates.set(appMode, true);
    }
    await nSQL().useDatabase(this.getDbName(appMode));
    return appMode;
  }
}
