import { NgModule } from '@angular/core';
import { CoreModule } from '@varsom-regobs-common/core';
import { FakeItemSyncCallbackService } from './services/item-sync-callback/fake-item-sync-callback.service';
import { RegobsApiSyncCallbackService } from './services/item-sync-callback/regobs-api-sync-callback.service';
import { RegobsApiModule } from '@varsom-regobs-common/regobs-api';

const USE_FAKE_SYNC_SERVICE = true;

@NgModule({
  imports: [
    CoreModule,
    RegobsApiModule,
  ],
  declarations: [],
  exports: [],
  providers: [{
    provide: 'OfflineRegistrationSyncService', useClass:
      USE_FAKE_SYNC_SERVICE ? FakeItemSyncCallbackService : RegobsApiSyncCallbackService
  }]
})
export class RegistrationModule { }
