import { ItemSyncCallbackService } from './item-sync-callback.service';
import { Injectable } from '@angular/core';
import { timer, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { IRegistration } from '../../models/registration.interface';

const DEBUG_TAG = 'FakeItemSyncCallbackService';

@Injectable()
export class FakeItemSyncCallbackService implements ItemSyncCallbackService<IRegistration> {
    syncItem(item: IRegistration): Observable<ItemSyncCompleteStatus<IRegistration>> {
        console.log(`[${DEBUG_TAG}] Sync item: `, item);
        return timer(Math.floor(Math.random() * 10) * 1000).pipe(map(() => ({ item, success: true, error: null })));
    }
}
