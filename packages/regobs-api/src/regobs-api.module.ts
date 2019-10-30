/* tslint:disable */
import { NgModule, ModuleWithProviders, InjectionToken, Provider } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RegobsApiConfiguration, RegobsApiConfigurationInterface } from './regobs-api-configuration';
import { AccountService } from './services/account.service';
import { GeneralObsService } from './services/general-obs.service';
import { GeoCodeService } from './services/geo-code.service';
import { HelptextService } from './services/helptext.service';
import { KdvElementsService } from './services/kdv-elements.service';
import { LocationService } from './services/location.service';
import { RegistrationService } from './services/registration.service';
import { SearchService } from './services/search.service';
import { TripService } from './services/trip.service';
import { RegObsApiConfigurationProvider } from './regobs-api-configuration-provider';
import { AppModeService } from '@varsom-regobs-common/core';
import { ApiInterceptor } from './api-interceptor';

export const FOR_ROOT_OPTIONS_TOKEN = new InjectionToken<RegobsApiConfigurationInterface>('forRoot() Module configuration');
export const API_KEY_TOKEN = new InjectionToken<IRegobsApiKeyProvider>('forRoot() Module configuration');

export interface IRegobsApiKeyProvider {
  apiKey: string;
}

/**
 * Provider for all regobsApi services, plus RegobsApiConfiguration
 */
@NgModule({
  imports: [
    HttpClientModule
  ],
  exports: [
    HttpClientModule
  ],
  declarations: [],
  providers: [
    RegobsApiConfiguration,
    AccountService,
    GeneralObsService,
    GeoCodeService,
    HelptextService,
    KdvElementsService,
    LocationService,
    RegistrationService,
    SearchService,
    TripService
  ],
})
export class RegobsApiModule {
  static forRoot(options?: RegobsApiConfigurationInterface): ModuleWithProviders {
    return {
      ngModule: RegobsApiModule,
      providers: [
        {
          provide: API_KEY_TOKEN,
          useValue: { apiKey: '' }
        },
        API_INTERCEPTOR_PROVIDER,
        {
          provide: FOR_ROOT_OPTIONS_TOKEN,
          useValue: options
        },
        {
          provide: RegobsApiConfiguration,
          useFactory: regObsConfigurationFactory,
          deps: [AppModeService, FOR_ROOT_OPTIONS_TOKEN],
        }
      ]
    }
  }
}

export function regObsConfigurationFactory(appModeService: AppModeService, options?: RegobsApiConfigurationInterface) {
  return options ? options : new RegObsApiConfigurationProvider(appModeService);
}

export const API_INTERCEPTOR_PROVIDER: Provider = {
  provide: HTTP_INTERCEPTORS,
  useClass: ApiInterceptor,
  deps: [API_KEY_TOKEN],
  multi: true
};
