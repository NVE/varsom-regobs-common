import { ItemSyncCallbackService } from './item-sync-callback.service';
import { IRegistration } from '../../models/registration.interface';
import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { RegistrationService } from '@varsom-regobs-common/regobs-api';
import { map, catchError } from 'rxjs/operators';

@Injectable()
export class RegobsApiSyncCallbackService implements ItemSyncCallbackService<IRegistration> {

    constructor(private regobsApiRegistrationService: RegistrationService) {
    }

    syncItem(item: IRegistration): Observable<ItemSyncCompleteStatus<IRegistration>> {
        return this.regobsApiRegistrationService.RegistrationInsert(item.request)
            .pipe(map(() => ({ success: true, item: item, error: undefined })),
                catchError((err) => of(({ success: false, item: item, error: Error(err.msg) })))
            );
    }
}
