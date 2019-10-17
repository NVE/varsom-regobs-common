import { Injectable } from '@angular/core';
import { AppMode, AppModeService } from '@varsom-regobs-common/core';
import { NSQL_TABLE_NAME_PLUGIN } from '../../db/nSQL-table-name.plugin';
import { Observable, from, defer, of, BehaviorSubject, ReplaySubject } from 'rxjs';
import { switchMap, shareReplay, tap, distinctUntilChanged } from 'rxjs/operators';
import { DB_NAME_TEMPLATE, DB_TABLE_CONFIG } from '../../db/nSQL-db.config';
import { nSQL } from '@nano-sql/core';

@Injectable({
  providedIn: 'root'
})
export class OfflineDbService {

  private dbConnected = new ReplaySubject<Map<AppMode, boolean>>(1);
  private _appModeInitialized$: Observable<AppMode>;

  public get appModeInitialized$(): Observable<AppMode> {
    return this._appModeInitialized$;
  }

  constructor(private appModeService: AppModeService) {
    this._appModeInitialized$ = this.appModeService.appMode$.pipe(distinctUntilChanged(),
      switchMap((appMode) => this.initAppMode(appMode)),
      shareReplay(1));
  }


  private getDbName(appMode: AppMode): string {
    return `${DB_NAME_TEMPLATE}_${appMode}`;
  }

  private initAppMode(appMode: AppMode) {
    console.log('initAppMode', appMode);
    return this.dbConnected.pipe(switchMap((m) =>
      m.get(appMode) ?
        defer(() => this.useDatabase(appMode))
        : defer(() => this.createDatabase(appMode)).pipe(tap(() => {
          this.dbConnected.next(m.set(appMode, true));
        }))));
  }

  private async useDatabase(appMode: AppMode): Promise<AppMode> {
    console.log('Use database', appMode);
    await nSQL().useDatabase(this.getDbName(appMode));
    return appMode;
  }

  private async createDatabase(appMode: AppMode): Promise<AppMode> {
    console.log('Create database', appMode);
    await nSQL().createDatabase({
      id: this.getDbName(appMode),
      mode: 'PERM',
      tables: DB_TABLE_CONFIG,
      plugins: [
        NSQL_TABLE_NAME_PLUGIN
      ],
    });
    return appMode;
  }
}
