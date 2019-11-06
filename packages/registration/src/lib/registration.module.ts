import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';
import { CoreModule } from '@varsom-regobs-common/core';
import { FakeItemSyncCallbackService } from './services/item-sync-callback/fake-item-sync-callback.service';
import { RegobsApiSyncCallbackService } from './services/item-sync-callback/regobs-api-sync-callback.service';
import { RegobsApiModule, RegistrationService } from '@varsom-regobs-common/regobs-api';
import { InanoSQLAdapter } from '@nano-sql/core/lib/interfaces';
import { OfflineDbServiceOptions } from './services/offline-db/offline-db-service.options';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { ISummaryProvider } from './services/summary-providers/summary-provider.interface';
import { GeneralObservationSummaryProvider } from './services/summary-providers/general-observation/general-observation.summary-provider';

export const FOR_ROOT_OPTIONS_TOKEN = new InjectionToken<IRegistrationModuleOptions>('forRoot() Module configuration');
export const SUMMARY_PROVIDER_TOKEN = new InjectionToken<ISummaryProvider>('Registration summary provider token');

export interface IRegistrationModuleOptions {
  dbMode?: string | InanoSQLAdapter;
  useFakeSyncService?: boolean;
}

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/varsom-regobs-registration/i18n', '.json');
}

@NgModule({
  imports: [
    CoreModule,
    RegobsApiModule,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    })
  ],
  declarations: [],
  exports: []
})
export class RegistrationModule {
  static forRoot(options?: IRegistrationModuleOptions): ModuleWithProviders {
    return ({
      ngModule: RegistrationModule,
      providers: [
        {
          provide: FOR_ROOT_OPTIONS_TOKEN,
          useValue: options
        },
        {
          provide: OfflineDbServiceOptions,
          useFactory: offlineDbServiceOptionsFactory,
          deps: [FOR_ROOT_OPTIONS_TOKEN]
        },
        {
          provide: 'OfflineRegistrationSyncService', useFactory:
            offlineRegistrationSyncServiceFactory,
          deps: [FOR_ROOT_OPTIONS_TOKEN, RegistrationService]
        },
        {
          provide: SUMMARY_PROVIDER_TOKEN, useClass: GeneralObservationSummaryProvider, multi: true
        }
      ]
    });
  }

  static forChild(options?: IRegistrationModuleOptions): ModuleWithProviders {
    return RegistrationModule.forRoot(options);
  }
}

export function offlineDbServiceOptionsFactory(options?: IRegistrationModuleOptions): OfflineDbServiceOptions {
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

export function offlineRegistrationSyncServiceFactory(registrationService: RegistrationService, options?: IRegistrationModuleOptions) {
  return options && options.useFakeSyncService ?
    new FakeItemSyncCallbackService() :
    new RegobsApiSyncCallbackService(registrationService);
}
