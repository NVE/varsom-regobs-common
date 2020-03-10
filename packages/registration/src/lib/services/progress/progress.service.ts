import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { SyncProgress } from '../../models/sync-progress';
import { LoggerService } from '@varsom-regobs-common/core';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {

  private _syncProgress$: BehaviorSubject<SyncProgress>;
  private _attachmentUploadProgress: Map<string, BehaviorSubject<{total: number; complete: number}>>;

  public get syncProgress$(): Observable<SyncProgress> {
    return this._syncProgress$.asObservable();
  }

  constructor(private loggerService: LoggerService) {
    this._syncProgress$ = new BehaviorSubject(new SyncProgress());
    this._attachmentUploadProgress = new Map<string, BehaviorSubject<{total: number; complete: number}>>();
  }

  resetSyncProgress(records?: Array<string>) {
    this._attachmentUploadProgress = new Map<string, BehaviorSubject<{total: number; complete: number}>>();
    const progress = new SyncProgress(records);
    this._syncProgress$.next(progress);
  }

  setSyncProgress(recordId: string, error?: Error) {
    this.loggerService.log('Sync record item complete', recordId);
    const progress = this._syncProgress$.value;
    if (error) {
      progress.setRecordError(recordId, error);
    } else {
      progress.setRecordComplete(recordId);
    }
    this._syncProgress$.next(progress);
  }

  getAttachmentProgress(fileUrl: string) {
    const currentSubject = this._attachmentUploadProgress.get(fileUrl);
    if(currentSubject) {
      return currentSubject.asObservable();
    }
    return of({ total: 0, complete: 0 });
  }

  setAttachmentProgress(fileUrl: string, total: number, complete: number) {
    this.loggerService.log(`Set attachment progress. Complete: ${complete}/${total}. ${fileUrl}`);
    const currentSubject = this._attachmentUploadProgress.get(fileUrl);
    const val = { total, complete };
    if(!currentSubject) {
      this._attachmentUploadProgress.set(fileUrl, new BehaviorSubject<{total: number; complete: number}>(val));
      return;
    }
    currentSubject.next(val);
  }
}
