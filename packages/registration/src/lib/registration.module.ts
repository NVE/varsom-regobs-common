import { NgModule, ModuleWithProviders, Injectable, InjectionToken } from '@angular/core';
import { CoreModule } from '@varsom-regobs-common/core';
import { FakeItemSyncCallbackService } from './services/item-sync-callback/fake-item-sync-callback.service';
import { RegobsApiSyncCallbackService } from './services/item-sync-callback/regobs-api-sync-callback.service';
import { RegobsApiModule } from '@varsom-regobs-common/regobs-api';
import { InanoSQLAdapter } from '@nano-sql/core/lib/interfaces';
import { OfflineDbServiceOptions } from './services/offline-db/offline-db-service.options';

export const FOR_ROOT_OPTIONS_TOKEN = new InjectionToken<IRegistrationModuleOptions>('forRoot() Module configuration');

export interface IRegistrationModuleOptions {
  dbMode?: string | InanoSQLAdapter;
  useFakeSyncService?: boolean;
}

@NgModule({
  imports: [
    CoreModule,
    RegobsApiModule,
  ],
  declarations: [],
  exports: []
})
export class RegistrationModule {
  static forRoot(options?: IRegistrationModuleOptions): ModuleWithProviders {
    const useFakeSyncService = (options ? options.useFakeSyncService : false) || false;
    return ({
      ngModule: RegistrationModule,
      providers: [
        {
          provide: FOR_ROOT_OPTIONS_TOKEN,
          useValue: options
        },
        {
          provide: OfflineDbServiceOptions,
          useFactory: provideOfflineDbServiceOptions,
          deps: [FOR_ROOT_OPTIONS_TOKEN]
        },
        {
          provide: 'OfflineRegistrationSyncService', useClass:
            useFakeSyncService ? FakeItemSyncCallbackService : RegobsApiSyncCallbackService
        }]
    });
  }
}

export function provideOfflineDbServiceOptions(options?: IRegistrationModuleOptions): OfflineDbServiceOptions {
  const offlineDbServiceOptions = new OfflineDbServiceOptions();
  // If the optional options were provided via the .forRoot() static method, then apply
  // them to the MyServiceOptions Type provider.
  if (options) {
    if (options.dbMode) {
      offlineDbServiceOptions.dbMode = options.dbMode;
    }
  }
  return offlineDbServiceOptions;
}
