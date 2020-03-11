import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
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
    RegistrationModule.forRoot(),
    AppRoutingModule,
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
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
