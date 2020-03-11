import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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

  private getOrCreateAttachmentUploadProgress(fileUrl: string): BehaviorSubject<{total: number; complete: number}> {
    const currentSubject = this._attachmentUploadProgress.get(fileUrl);
    if(!currentSubject) {
      const newSubject = new BehaviorSubject<{total: number; complete: number}>({ total: 0, complete: 0 });
      this._attachmentUploadProgress.set(fileUrl, newSubject);
      return newSubject;
    }
    return currentSubject;
  }

  getAttachmentProgress(fileUrl: string): Observable<{total: number; complete: number}> {
    return  this.getOrCreateAttachmentUploadProgress(fileUrl).asObservable();
  }

  setAttachmentProgress(fileUrl: string, total: number, complete: number) {
    this.loggerService.log(`Set attachment progress. Complete: ${complete}/${total}. ${fileUrl}`);
    this.getOrCreateAttachmentUploadProgress(fileUrl).next({ total, complete });
  }
}
