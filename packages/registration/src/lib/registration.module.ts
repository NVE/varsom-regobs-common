import { NgModule, ModuleWithProviders, InjectionToken, APP_INITIALIZER } from '@angular/core';
import { CoreModule } from '@varsom-regobs-common/core';
import { FakeItemSyncCallbackService } from './services/item-sync-callback/fake-item-sync-callback.service';
import { RegobsApiSyncCallbackService } from './services/item-sync-callback/regobs-api-sync-callback.service';
import { RegobsApiModuleWithConfig, KdvElementsService, HelptextService as HelpTextApiService } from '@varsom-regobs-common/regobs-api';
import { OfflineDbServiceOptions } from './services/offline-db/offline-db-service.options';
import { TranslateModule } from '@ngx-translate/core';
import { ISummaryProvider } from './services/summary-providers/summary-provider.interface';
import { GeneralObservationSummaryProvider } from './services/summary-providers/general-observation/general-observation.summary-provider';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpConnectivityInterceptor } from 'ngx-connectivity';
import { NewAttachmentService } from './services/add-new-attachment/new-attachment.service';
import { throwError } from 'rxjs';
import { WeatherSummaryProvider } from './services/summary-providers/snow/weather/weather.summary-provider';
import { RegobsRegistrationPipesModule } from './registration.pipes';
import { OfflineDbNewAttachmentService } from './services/add-new-attachment/offline-db-new-attachment.service';
import { OfflineDbService } from './registration.services';

export const FOR_ROOT_OPTIONS_TOKEN = new InjectionToken<IRegistrationModuleOptions>('forRoot() Module configuration');
export const SUMMARY_PROVIDER_TOKEN = new InjectionToken<ISummaryProvider>('Registration summary provider token');

export interface IRegistrationModuleOptions {
  adapter?: string;
  autoSync?: boolean;
}

export function initDb(dbService: OfflineDbService, options: OfflineDbServiceOptions): () => Promise<void> {
  const res = () => dbService.initDatabase(options.adapter);
  return res;
}

export function offlineDbServiceOptionsFactory(options?: IRegistrationModuleOptions): OfflineDbServiceOptions {
  const offlineDbServiceOptions = new OfflineDbServiceOptions();
  // If the optional options were provided via the .forRoot() static method, then apply
  // them to the MyServiceOptions Type provider.
  if (options) {
    if (options.adapter) {
      offlineDbServiceOptions.adapter = options.adapter;
    }
  }
  return offlineDbServiceOptions;
}

export function getFakeKdvElementsService(): unknown {
  const fakeService = { KdvElementsGetKdvs: () => throwError(Error('Fake service')) };
  return fakeService;
}

export function getFakeHelpTextApiService(): unknown {
  const fakeService = { HelptextGet: () => throwError(Error('Fake service')) };
  return fakeService;
}

@NgModule({
  imports: [
    CoreModule,
    RegobsApiModuleWithConfig,
    TranslateModule,
  ],
  declarations: [],
  exports: [
    RegobsRegistrationPipesModule,
  ]
})
export class RegistrationModule {
  static forRoot(options?: IRegistrationModuleOptions): ModuleWithProviders<RegistrationModule> {
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
          provide: 'OfflineRegistrationSyncService', useClass: RegobsApiSyncCallbackService
        },
        {
          provide: SUMMARY_PROVIDER_TOKEN, useClass: GeneralObservationSummaryProvider, multi: true
        },
        {
          provide: SUMMARY_PROVIDER_TOKEN, useClass: WeatherSummaryProvider, multi: true
        },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: HttpConnectivityInterceptor,
          multi: true
        },
        {
          provide: NewAttachmentService, useClass: OfflineDbNewAttachmentService
        }
      ]
    });
  }

  static forChild(options?: IRegistrationModuleOptions): ModuleWithProviders<RegistrationModule> {
    return RegistrationModule.forRoot(options);
  }

  static forTesting(): ModuleWithProviders<RegistrationModule> {
    return ({
      ngModule: RegistrationModule,
      providers: [
        {
          provide: FOR_ROOT_OPTIONS_TOKEN,
          useValue: { adapter: 'memory' }
        },
        {
          provide: OfflineDbServiceOptions,
          useValue: { adapter: 'memory' },
        },
        {
          provide: 'OfflineRegistrationSyncService', useClass: FakeItemSyncCallbackService
        },
        {
          provide: SUMMARY_PROVIDER_TOKEN, useClass: GeneralObservationSummaryProvider, multi: true
        },
        {
          provide: SUMMARY_PROVIDER_TOKEN, useClass: WeatherSummaryProvider, multi: true
        },
        {
          provide: NewAttachmentService, useClass: OfflineDbNewAttachmentService
        },
        { provide: KdvElementsService, useFactory: getFakeKdvElementsService },
        { provide: HelpTextApiService, useFactory: getFakeHelpTextApiService },
        {
          provide: APP_INITIALIZER,
          useFactory: initDb,
          multi: true,
          deps: [OfflineDbService, OfflineDbServiceOptions]
        },
      ]
    });
  }
}
