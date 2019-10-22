import { Injectable, Inject } from '@angular/core';
import { AppMode } from '../models';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppConfig } from '../models';
import { APP_CONFIG } from '../core.module';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AppModeService {

  public get appMode$(): Observable<AppMode> {
    return this.appModeSubject;
  }

  private appModeSubject: BehaviorSubject<AppMode>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.appModeSubject = new BehaviorSubject(config.appMode);
  }

  public setAppMode(appMode: AppMode) {
    this.appModeSubject.next(appMode);
  }

}