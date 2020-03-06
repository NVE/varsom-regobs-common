import { ItemSyncCallbackService } from './item-sync-callback.service';
import { IRegistration } from '../../models/registration.interface';
import { Observable, of, from, forkJoin } from 'rxjs';
import { Injectable } from '@angular/core';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { RegistrationService, AttachmentService as ApiAttachmentService } from '@varsom-regobs-common/regobs-api';
import { map, catchError, concatMap, switchMap, tap, filter, take } from 'rxjs/operators';
import { LanguageService, LangKey } from '@varsom-regobs-common/core';
import { AttachmentFileBlobService } from '../attachment-file-blob/attachment-file-blob.service';
import { AttachmentUploadEditModel } from '../../models/attachment-upload-edit.interface';
import { LoggerService } from '@varsom-regobs-common/core';
import { getAllAttachments } from '../../helpers/registration.helper';
import { HttpClient, HttpHeaders, HttpEventType, HttpResponse } from '@angular/common/http';
import { ProgressService } from '../progress/progress.service';

@Injectable()
export class RegobsApiSyncCallbackService implements ItemSyncCallbackService<IRegistration> {

  constructor(private regobsApiRegistrationService: RegistrationService,
    private languageService: LanguageService,
    private apiAttachmentService: ApiAttachmentService,
    private attachmentFileBlobService: AttachmentFileBlobService,
    private loggerService: LoggerService,
    private httpClient: HttpClient,
    private progressService: ProgressService,
  ) {
  }

  syncItem(item: IRegistration): Observable<ItemSyncCompleteStatus<IRegistration>> {
    return this.languageService.language$.pipe(
      concatMap((langKey) => this.insertOrUpdate(item, langKey))
    );
  }

  insertOrUpdate(item: IRegistration, langKey: LangKey): Observable<ItemSyncCompleteStatus<IRegistration>> {
    this.loggerService.debug('Start insertOrUpdate: ', item, langKey);
    return this.uploadAttachments(item).pipe(switchMap((result) => {
      this.loggerService.debug('Result from attachment upload: ', result);
      this.loggerService.debug('Registration is now: ', item);
      return (item.response ?
        this.regobsApiRegistrationService.RegistrationInsertOrUpdate({ registration: item.request, id: item.response.RegId, langKey, externalReferenceId: item.id })
        : this.regobsApiRegistrationService.RegistrationInsert({ registration: item.request, langKey, externalReferenceId: item.id }))
        .pipe(map((result) => ({ success: true, item: ({ ...item, response: result }), error: undefined })),
          catchError((err) => of(({ success: false, item: item, error: Error(err.msg) }))));
    }));
  }

  uploadAttachments(item: IRegistration): Observable<AttachmentUploadEditModel[]> {
    const attachmentsToUpload = this.getAttachmentsToUpload(item);
    if(attachmentsToUpload.length > 0) {
      this.loggerService.debug('Attachments to upload: ', attachmentsToUpload);
      return forkJoin(attachmentsToUpload.map((a) => this.uploadAttachmentAndSetAttachmentUploadId(item, a)));
    }
    this.loggerService.debug('No attachments to uplaod');
    return of([]);
  }

  // uploadAttachmentAndSetAttachmentUploadId(item: AttachmentUploadEditModel): Observable<AttachmentUploadEditModel> {
  //   return this.getAttachmentBlobObservable(item).pipe(switchMap((blob) =>
  //     this.apiAttachmentService.AttachmentPost(blob) // TODO: Upload attachment with progress
  //       .pipe(map((result) => {
  //         item.AttachmentUploadId = result;
  //         this.loggerService.debug('Attachment uploaded. New model: ', item);
  //         return item;
  //       }))), catchError((err: Error) => of({...item, error: err })), take(1));
  // }

  uploadAttachmentAndSetAttachmentUploadId(item: IRegistration,
    attachmentUpload: AttachmentUploadEditModel): Observable<AttachmentUploadEditModel> {
    return this.getAttachmentBlobObservable(attachmentUpload).pipe(switchMap((blob) =>
      this.uploadAttachmentWithProgress(attachmentUpload.fileUrl, blob)
        .pipe(map((result) => {
          attachmentUpload.AttachmentUploadId = result;
          this.loggerService.debug('Attachment uploaded. New model: ', item);
          return attachmentUpload;
        }))), catchError((err: Error) => of({...item, error: err })), take(1));
  }

  getAttachmentBlobObservable(item: AttachmentUploadEditModel): Observable<Blob> {
    return from(this.attachmentFileBlobService.getAttachment(item.fileUrl));
  }

  getAttachmentsToUpload(item: IRegistration) {
    return getAllAttachments(item).map(a => a as AttachmentUploadEditModel).filter((a) => !!a.fileUrl && !a.AttachmentUploadId); // Has file url but not attachment upload id
  }

  uploadAttachmentWithProgress(fileUrl: string, blob: Blob) {
    const attachmentPostPath = `${this.apiAttachmentService.rootUrl}${ApiAttachmentService.AttachmentPostPath}`;
    const formData = new FormData();
    formData.append('file', blob);
    return this.httpClient.post(attachmentPostPath , formData, {
      responseType: 'json', reportProgress: true, observe: 'events'
    }).pipe(tap((event) => {
      if (event.type === HttpEventType.UploadProgress) {
        this.progressService.setAttachmentProgress(fileUrl, event.total, event.loaded);
      }
    }), filter((event) => event.type === HttpEventType.Response),
    map((event: HttpResponse<string>) => {
      if(!event.ok) {
        throw Error( `Could not upload attachment: Status: ${event.statusText}`);
      }
      return event.body;
    }),
    // switchMap((blob) => from(this.getStringFromBlobResult(blob))),
    tap((result) => this.loggerService.debug(`Attachment uploaded with attachment id: ${result} `))
    );
  }

  // private getStringFromBlobResult(result: Blob): Promise<string> {
  //   return new Promise((resolve) => {
  //     const reader = new FileReader();

  //     // This fires after the blob has been read/loaded.
  //     reader.addEventListener('loadend', () => {
  //       resolve(reader.result as string);
  //     });

  //     // Start reading the blob as text.
  //     reader.readAsText(result);
  //   });
  // }

}
