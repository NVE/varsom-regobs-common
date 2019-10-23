import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { Observable } from 'rxjs';

export abstract class ItemSyncCallbackService<T> {
  abstract syncItem(item: T): Observable<ItemSyncCompleteStatus<T>>;
}
