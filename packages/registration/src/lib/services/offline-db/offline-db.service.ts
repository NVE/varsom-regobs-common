import { Injectable } from '@angular/core';
import { AppMode, AppModeService } from '@varsom-regobs-common/core';
import { NSQL_TABLE_NAME_PLUGIN } from '../../db/nSQL-table-name.plugin';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DB_NAME_TEMPLATE, DB_TABLE_CONFIG } from '../../db/nSQL-db.config';
import { nSQL } from '@nano-sql/core';

@Injectable({
  providedIn: 'root'
})
export class OfflineDbService {

  private appModeInitStates = new Map<AppMode, boolean>();

  public get appModeInitialized$(): Observable<AppMode> {
    return this.appModeService.appMode$.pipe(
      switchMap((appMode) => from(this.initAppMode(appMode))));
  }

  constructor(private appModeService: AppModeService) { }


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
        tables: DB_TABLE_CONFIG,
        plugins: [
          NSQL_TABLE_NAME_PLUGIN
        ],
      });
      this.appModeInitStates = this.appModeInitStates.set(appMode, true);
    }
    await nSQL().useDatabase(this.getDbName(appMode));
    return appMode;
  }

}
