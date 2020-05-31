import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SyncProgress } from '../../models/sync-progress';
import { LoggerService } from '@varsom-regobs-common/core';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {

  private _syncProgress$: BehaviorSubject<SyncProgress>;
  private _attachmentUploadProgress: BehaviorSubject<Map<string, {total: number; complete: number}>>;

  public get syncProgress$(): Observable<SyncProgress> {
    return this._syncProgress$.asObservable();
  }

  constructor(private loggerService: LoggerService) {
    this._syncProgress$ = new BehaviorSubject(new SyncProgress());
    this._attachmentUploadProgress = new BehaviorSubject(new Map<string, {total: number; complete: number}>());
  }

  resetSyncProgress(records?: Array<string>) {
    const progress = new SyncProgress(records);
    this._syncProgress$.next(progress);
  }

  setSyncProgress(recordId: string, error?: string | unknown) {
    this.loggerService.log('Sync record item complete', recordId);
    const progress = this._syncProgress$.value;
    if (error) {
      progress.setRecordError(recordId, error);
    } else {
      progress.setRecordComplete(recordId);
    }
    this._syncProgress$.next(progress);
  }

  getAttachmentProgress(fileUrl: string): Observable<{total: number; complete: number}> {
    return this._attachmentUploadProgress.pipe(map((up) => up.get(fileUrl) || { total: 0, complete: 0 }));
  }

  setAttachmentProgress(fileUrl: string, total: number, complete: number) {
    this.loggerService.log(`Set attachment progress. Complete: ${complete}/${total}. ${fileUrl}`);
    this._attachmentUploadProgress.next(this._attachmentUploadProgress.value.set(fileUrl, {total, complete}));
  }
}
