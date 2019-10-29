import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Injectable } from '@angular/core';
import { RegistrationModule } from '@varsom-regobs-common/registration';
import { CoreModule } from '@varsom-regobs-common/core';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { KdvElementsComponent } from './kdv-elements/kdv-elements.component';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './home/home.component';
import { RegistrationComponent } from './registration/registration.component';
import { LanguageSelectComponent } from './components/language-select/language-select.component';
import { API_KEY_TOKEN } from '@varsom-regobs-common/regobs-api';
import { LocalStorageApiKeyProvider } from './local-storage-api-key.provider';


@NgModule({
  declarations: [
    AppComponent,
    KdvElementsComponent,
    HomeComponent,
    RegistrationComponent,
    LanguageSelectComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    CoreModule,
    RegistrationModule.forRoot({ useFakeSyncService: true }),
    AppRoutingModule,
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
