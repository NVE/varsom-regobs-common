import { Injectable } from '@angular/core';
import { IOfflineSyncOptions } from '../../models/offline-sync-options.interface';
import { ItemSyncCallbackService } from '../item-sync-callback/item-sync-callback.service';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { Observable, from, of, forkJoin, concat } from 'rxjs';
import { concatMap, tap, map, catchError, flatMap, mergeMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService<T> {


  constructor(private itemSyncCallbackService: ItemSyncCallbackService<T>) {
  }

  public syncOfflineRecords() {
    return (src: Observable<T[]>) =>
      src.pipe(mergeMap((rows) =>
        concat(rows.map((row) => (this.syncRecord(row)))),
      ), mergeMap((r) => r));
  }

  public syncRecord(item: T): Observable<ItemSyncCompleteStatus<T>> {
    console.log('In sync record', item);
    // const onBeforeRecordSync = () =>
    //   (typeof (options.onBeforeRecordSync) === 'function') ?
    //     from(Promise.resolve(options.onBeforeRecordSync(item))) : of(false);

    // const onAfterRecordSync: (status: ItemSyncCompleteStatus<T>) => Observable<ItemSyncCompleteStatus<T>>
    //   = (status: ItemSyncCompleteStatus<T>) =>
    //     typeof (options.onAfterRecordSync) === 'function' ?
    //       from(Promise.resolve(options.onAfterRecordSync(status.item, status.success, status.error)))
    //       : of(status);

    return this.itemSyncCallbackService.syncItem(item).pipe(
      catchError((err) => of(({ item, success: false, error: err }))),
      tap((result) => console.log('sync item complete', result)));
    // concatMap((result) => onAfterRecordSync(result).pipe(map(() => result))));
  }
}
