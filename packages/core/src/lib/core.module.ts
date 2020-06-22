import { NgModule, InjectionToken } from '@angular/core';
import { AppConfig, AppMode, LangKey } from './models';
import { RegobsCorePipesModule } from './pipes';

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');
export const DEFAULT_APP_CONFIG: AppConfig = {
  appMode: AppMode.Prod,
  language: LangKey.no,
};

@NgModule({
  declarations: [],
  imports: [],
  exports: [
    RegobsCorePipesModule
  ],
  providers: [{ provide: APP_CONFIG, useValue: DEFAULT_APP_CONFIG }]
})
export class CoreModule { }
