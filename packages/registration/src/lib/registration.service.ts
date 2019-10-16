import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { nSQL } from '@nano-sql/core';
import { CreateRegistrationRequestDto } from '@varsom-regobs-common/regobs-api';
import { tables } from './db_config';
import { AppMode, AppModeService } from '@varsom-regobs-common/core';
import { switchMap, pairwise } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  private appModeInitStates = new Map<AppMode, { initialized: boolean, connected: boolean }>();

  public get registrationStorage$(): Observable<{ id: string, reg: CreateRegistrationRequestDto }[]> {
    return this.appModeInitialized$.pipe(switchMap(() => from(
      (nSQL('registration').query('select').exec() as Promise<{ id: string, reg: CreateRegistrationRequestDto }[]>))));
  }

  public get appModeInitialized$(): Observable<AppMode> {
    return this.appModeService.appMode$.pipe(pairwise(),
      switchMap(([prev, currentAppMode]) => from(this.initAppMode(prev, currentAppMode))));
  }

  constructor(private appModeService: AppModeService) { }

  private getDbName(appMode: AppMode): string {
    return `regobs_registration_${appMode}`;
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
      });
      currentState.initialized = true;
    }
    if (!currentState.connected) {
      await nSQL().connect({ id: this.getDbName(currentAppMode) });
    }
    currentState.connected = true;
    this.appModeInitStates = this.appModeInitStates.set(currentAppMode, currentState);
    return currentAppMode;
  }
}
