/* tslint:disable */
import { NgModule, ModuleWithProviders } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
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
  static forRoot(customParams: RegobsApiConfigurationInterface): ModuleWithProviders {
    return {
      ngModule: RegobsApiModule,
      providers: [
        {
          provide: RegobsApiConfiguration,
          useValue: {rootUrl: customParams.rootUrl}
        }
      ]
    }
  }
}