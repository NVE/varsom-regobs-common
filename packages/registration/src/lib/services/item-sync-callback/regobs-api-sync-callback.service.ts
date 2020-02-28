import { ItemSyncCallbackService } from './item-sync-callback.service';
import { IRegistration } from '../../models/registration.interface';
import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { RegistrationService } from '@varsom-regobs-common/regobs-api';
import { map, catchError, concatMap } from 'rxjs/operators';
import { LanguageService } from '@varsom-regobs-common/core';

@Injectable()
export class RegobsApiSyncCallbackService implements ItemSyncCallbackService<IRegistration> {

  constructor(private regobsApiRegistrationService: RegistrationService, private languageService: LanguageService) {
  }

  syncItem(item: IRegistration): Observable<ItemSyncCompleteStatus<IRegistration>> {
    return this.languageService.language$.pipe(
      concatMap((langKey) => this.regobsApiRegistrationService.RegistrationInsert({ registration: item.request, langKey, externalReferenceId: item.id })),
      map(() => ({ success: true, item: item, error: undefined })),
      catchError((err) => of(({ success: false, item: item, error: Error(err.msg) })))
    );
  }
}
