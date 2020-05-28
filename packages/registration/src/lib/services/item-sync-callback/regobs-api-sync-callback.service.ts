import { ItemSyncCallbackService } from './item-sync-callback.service';
import { IRegistration } from '../../models/registration.interface';
import { Observable, of, forkJoin } from 'rxjs';
import { Injectable } from '@angular/core';
import { ItemSyncCompleteStatus } from '../../models/item-sync-complete-status.interface';
import { RegistrationService, AttachmentService as ApiAttachmentService, AttachmentEditModel, DamageObsEditModel, WaterLevelMeasurementEditModel } from '@varsom-regobs-common/regobs-api';
import { map, catchError, concatMap, switchMap, tap, filter, take } from 'rxjs/operators';
import { LanguageService, LangKey } from '@varsom-regobs-common/core';
import { AttachmentUploadEditModel } from '../../models/attachment-upload-edit.interface';
import { LoggerService } from '@varsom-regobs-common/core';
import { HttpClient, HttpEventType, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { ProgressService } from '../progress/progress.service';
import { AddNewAttachmentService } from '../add-new-attachment/add-new-attachment.service';

@Injectable()
export class RegobsApiSyncCallbackService implements ItemSyncCallbackService<IRegistration> {

  constructor(private regobsApiRegistrationService: RegistrationService,
    private languageService: LanguageService,
    private apiAttachmentService: ApiAttachmentService,
    private addNewAttachmentService: AddNewAttachmentService,
    private loggerService: LoggerService,
    private httpClient: HttpClient,
    private progressService: ProgressService,
  ) {
  }

  deleteItem(item: IRegistration): Observable<boolean> {
    if (!item || !item.response || !(item.response.RegId > 0)) {
      return of(false);
    }
    return this.regobsApiRegistrationService.RegistrationDelete(item.response.RegId).pipe(map(() => true));
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
      const uploadSuccess = !result.some((a) => a.error);
      let attachmentStatusCode: number = undefined;
      if (!uploadSuccess) {
        attachmentStatusCode = result.map((a) => (a.error as HttpErrorResponse).status || 0).reduce((pv, cv) => cv > pv ? cv : pv, 0);
      }
      return (item.response ?
        this.regobsApiRegistrationService.RegistrationInsertOrUpdate({ registration: item.request, id: item.response.RegId, langKey, externalReferenceId: item.id })
        : this.regobsApiRegistrationService.RegistrationInsert({ registration: item.request, langKey, externalReferenceId: item.id }))
        .pipe(switchMap((result) => this.removeSuccessfulAttachments(item).pipe(map(() => result))),
          map((result) => ({
            success: uploadSuccess,
            item: ({ ...item, response: result }),
            statusCode: attachmentStatusCode,
            error: uploadSuccess ? undefined : 'Could not upload attachments'
          })),
          catchError((err: HttpErrorResponse) => {
            const errorMsg = err ? (err.error ? err.error : err.message) : '';
            return of(({ success: false, item: item, statusCode: err.status, error: errorMsg }));
          }));
    }));
  }

  removeSuccessfulAttachments(item: IRegistration) {
    return this.getAttachmentsToUpload(item).pipe(take(1), tap((attachmentsToUpload) => {
      for (const attachmentUpload of attachmentsToUpload.filter((a) => !a.error)) {
        this.addNewAttachmentService.removeAttachment(item.id, attachmentUpload);
      }
    }), map(() => item));
  }

  uploadAttachments(item: IRegistration): Observable<AttachmentUploadEditModel[]> {
    return this.getAttachmentsToUpload(item).pipe(take(1), switchMap((attachmentsToUpload) => {
      if (attachmentsToUpload.length > 0) {
        this.loggerService.debug('Attachments to upload: ', attachmentsToUpload);
        return forkJoin(attachmentsToUpload.map((a) =>
          this.uploadAttachmentAndSetAttachmentUploadId(item, a).pipe(take(1))));
      }
      this.loggerService.debug('No attachments to uplaod');
      return of([]);
    }));
  }

  uploadAttachmentAndSetAttachmentUploadId(reg: IRegistration,
    attachmentUpload: AttachmentUploadEditModel): Observable<AttachmentUploadEditModel> {
    attachmentUpload.error = undefined;
    return this.addNewAttachmentService.getBlob(reg.id, attachmentUpload).pipe(
      switchMap((blob) =>
        this.uploadAttachmentWithProgress(attachmentUpload.fileUrl, blob)
          .pipe(map((uploadId) => {
            this.loggerService.debug('Attachment uploaded. Removing from attachment to upload and adding to request', attachmentUpload, reg);
            this.addAttachmentToRequest(uploadId, attachmentUpload, reg);
            return attachmentUpload;
          }))),
      catchError((err: Error) => {
        this.loggerService.debug('Could not upload attachment. Setting error.', err);
        attachmentUpload.error = err;
        return of(attachmentUpload);
      }));
  }

  private addAttachmentToRequest(uploadId: string, attachmentUploadEditModel: AttachmentUploadEditModel, reg: IRegistration) {
    const attachment = {
      AttachmentUploadId: uploadId,
      Photographer: attachmentUploadEditModel.Photographer,
      Copyright: attachmentUploadEditModel.Copyright,
      Aspect: attachmentUploadEditModel.Aspect,
      GeoHazardTID: attachmentUploadEditModel.GeoHazardTID,
      RegistrationTID: attachmentUploadEditModel.RegistrationTID,
      Comment: attachmentUploadEditModel.Comment,
      AttachmentMimeType: attachmentUploadEditModel.AttachmentMimeType,
      IsMainAttachment: attachmentUploadEditModel.IsMainAttachment,
    };
    if (attachmentUploadEditModel.type === 'DamageObsAttachment' || attachmentUploadEditModel.type === 'WaterLevelMeasurementAttachment') {
      this.addDamageObsOrWaterLevelAttachment(attachment, reg, attachmentUploadEditModel.ref);
      return;
    }
    if (!reg.request.Attachments) {
      reg.request.Attachments = [];
    }
    reg.request.Attachments.push(attachment);
  }

  private addDamageObsOrWaterLevelAttachment(attachment: AttachmentEditModel, reg: IRegistration, ref: DamageObsEditModel | WaterLevelMeasurementEditModel) {
    if (ref) {
      if (!ref.Attachments) {
        ref.Attachments = [];
      }
      ref.Attachments.push(attachment);
    }
  }

  getAttachmentsToUpload(item: IRegistration): Observable<AttachmentUploadEditModel[]> {
    return this.addNewAttachmentService.getUploadedAttachments(item.id);
  }

  uploadAttachmentWithProgress(fileUrl: string, blob: Blob) {
    const attachmentPostPath = `${this.apiAttachmentService.rootUrl}${ApiAttachmentService.AttachmentPostPath}`;
    const formData = new FormData();
    formData.append('file', blob);
    return this.httpClient.post(attachmentPostPath, formData, {
      responseType: 'json', reportProgress: true, observe: 'events'
    }).pipe(tap((event) => {
      this.loggerService.debug('uploadAttachmentWithProgress got event:', event);
      if (event.type === HttpEventType.UploadProgress) {
        this.progressService.setAttachmentProgress(fileUrl, event.total, event.loaded);
      }
    }), filter((event) => event.type === HttpEventType.Response),
    map((event: HttpResponse<string>) => {
      if (!event.ok) {
        throw Error(`Could not upload attachment: Status: ${event.statusText}`);
      }
      return event.body;
    }),
    tap((result) => this.loggerService.debug(`Attachment uploaded with attachment id: ${result} `))
    );
  }
}
