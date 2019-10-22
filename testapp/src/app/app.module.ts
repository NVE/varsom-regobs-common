import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {
  RegistrationModule,
  OfflineSyncService,
  FakeItemSyncCallbackService,
  IRegistration,
} from '@varsom-regobs-common/registration';
import { CoreModule } from '@varsom-regobs-common/core';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    CoreModule,
    RegistrationModule,
  ],
  providers: [
    {
      provide: 'OfflineRegistrationSyncService', useFactory: () =>
        new OfflineSyncService(new FakeItemSyncCallbackService())
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
