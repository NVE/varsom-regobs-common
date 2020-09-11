import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { RegistrationModule } from '@varsom-regobs-common/registration';
import { CoreModule } from '@varsom-regobs-common/core';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { KdvElementsComponent } from './kdv-elements/kdv-elements.component';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './home/home.component';
import { RegistrationComponent } from './registration/registration.component';
import { LanguageSelectComponent } from './components/language-select/language-select.component';
import { API_KEY_TOKEN, RegobsApiModuleWithConfig } from '@varsom-regobs-common/regobs-api';
import { LocalStorageApiKeyProvider } from './local-storage-api-key.provider';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { HelptextsComponent } from './helptexts/helptexts.component';
import { TranslateModule } from '@ngx-translate/core';
import { addRxPlugin } from 'rxdb';
import { OfflineDbService } from '@varsom-regobs-common/registration';

// eslint-disable-next-line @typescript-eslint/no-var-requires

export function initDb(dbService: OfflineDbService) {
  return (): Promise<any> =>  {
    return import('pouchdb-adapter-idb').then(addRxPlugin).then(() => dbService.initDatabase('idb'));
  };
}

@NgModule({
  declarations: [
    AppComponent,
    KdvElementsComponent,
    HomeComponent,
    RegistrationComponent,
    LanguageSelectComponent,
    HelptextsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    CoreModule,
    RegobsApiModuleWithConfig.forRoot(),
    RegistrationModule.forRoot({ adapter: 'idb', autoSync: false }),
    AppRoutingModule,
    TranslateModule.forRoot(),
    LoggerModule.forRoot({ level: NgxLoggerLevel.DEBUG }),
  ],
  providers: [
    {
      provide: API_KEY_TOKEN,
      useClass: LocalStorageApiKeyProvider,
    },
    {
      provide: LocalStorageApiKeyProvider,
      useClass: LocalStorageApiKeyProvider,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initDb,
      multi: true,
      deps: [OfflineDbService]
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
