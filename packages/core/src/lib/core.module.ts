import { NgModule, InjectionToken } from '@angular/core';
import { AppConfig, AppMode } from './models';


export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');
export const DEFAULT_APP_CONFIG: AppConfig = {
  appMode: AppMode.Prod
};

@NgModule({
  declarations: [],
  imports: [],
  exports: [],
  providers: [{ provide: APP_CONFIG, useValue: DEFAULT_APP_CONFIG }]
})
export class CoreModule { }
