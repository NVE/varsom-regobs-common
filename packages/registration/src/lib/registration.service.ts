import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { nSQL } from '@nano-sql/core';
import { CreateRegistrationRequestDto } from '@varsom-regobs-common/regobs-api';
import { tables, TABLE_NAMES, DB_NAME_TEMPLATE } from './db_config';
import { AppMode, AppModeService, NSqlFullTableObservable } from '@varsom-regobs-common/core';
import { switchMap, pairwise, map, tap, startWith } from 'rxjs/operators';
import { uuid } from '@nano-sql/core/lib/utilities';
import { InanoSQLTable, InanoSQLQuery } from '@nano-sql/core/lib/interfaces';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  private appModeInitStates = new Map<AppMode, { initialized: boolean, connected: boolean }>();

  public get registrationStorage$(): Observable<{ id: string, reg: CreateRegistrationRequestDto }[]> {
    return this.appModeInitialized$.pipe(
      tap((appMode) => console.log('App mode initialized: ', appMode)),
      switchMap(() => this.getRegistrationObservable()));
  }

  public get appModeInitialized$(): Observable<AppMode> {
    return this.appModeService.appMode$.pipe(startWith(<AppMode>null), pairwise(),
      switchMap(([prev, currentAppMode]) => from(this.initAppMode(prev, currentAppMode))));
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

  private async initAppMode(prev: AppMode, currentAppMode: AppMode): Promise<AppMode> {
    if (prev !== null) {
      const prevState = this.appModeInitStates.get(prev);
      if (prevState !== null && prevState.connected) {
        await nSQL().disconnect(this.getDbName(prev));
        prevState.connected = false;
        this.appModeInitStates = this.appModeInitStates.set(prev, prevState);
      }
    }

    const currentState = this.appModeInitStates.get(currentAppMode) || { initialized: false, connected: false };
    if (!currentState.initialized) {
      await nSQL().createDatabase({
        id: this.getDbName(currentAppMode),
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
      currentState.initialized = true;
      currentState.connected = true;
    }
    if (!currentState.connected) {
      await nSQL().connect({ id: this.getDbName(currentAppMode) });
      currentState.connected = true;
    }
    this.appModeInitStates = this.appModeInitStates.set(currentAppMode, currentState);
    return currentAppMode;
  }
}
