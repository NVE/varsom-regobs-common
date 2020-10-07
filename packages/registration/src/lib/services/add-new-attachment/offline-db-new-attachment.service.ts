import { Injectable } from '@angular/core';
import { EMPTY, forkJoin, from, Observable, of } from 'rxjs';
import { AppMode, AppModeService, GeoHazard, LoggerService, uuidv4 } from '@varsom-regobs-common/core';
import { AttachmentType, AttachmentUploadEditModel } from '../../models/attachment-upload-edit.interface';
import { OfflineDbService, TABLE_NAMES } from '../offline-db/offline-db.service';
import { NewAttachmentService } from './new-attachment.service';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';
import { RxAttachmentMetaCollection, RxAttachmentMetaDocument, RxRegistrationCollection, RxRegistrationDocument } from '../../db/RxDB';
import { RegistrationTid } from '../../models/registration-tid.enum';

@Injectable()
export class OfflineDbNewAttachmentService implements NewAttachmentService {
  constructor(private offlineDbService: OfflineDbService, private appModeService: AppModeService, private loggerService: LoggerService) {
  }

  addAttachment(registrationId: string, data: Blob, mimeType: string, geoHazard: GeoHazard, registrationTid: RegistrationTid, type?: AttachmentType, ref?: string): void {
    const attachmentId = uuidv4();
    this.getRegistrationOfflineDocumentById(registrationId).pipe(take(1), switchMap((doc) =>
      this.saveAttachmentMeta$({
        id: attachmentId,
        AttachmentMimeType: mimeType,
        GeoHazardTID: geoHazard,
        RegistrationTID: registrationTid,
        type,
        ref,
        fileSize: 0,
      }).pipe(switchMap(() => from(doc.putAttachment({
        id: attachmentId,
        data,
        type: mimeType
      }
      ))))), catchError((err) => {
      this.loggerService.error(() => 'Could not add attachment', err);
      return EMPTY;
    })).subscribe();
  }

  saveAttachmentMeta(meta: AttachmentUploadEditModel): void {
    this.saveAttachmentMeta$(meta).pipe(catchError((err) => {
      this.loggerService.error(() => 'Could not save attachment metadata', err);
      return EMPTY;
    })).subscribe();
  }

  getUploadedAttachments(registrationId: string): Observable<AttachmentUploadEditModel[]> {
    return this.getRegistrationOfflineDocumentById(registrationId).pipe(
      switchMap((doc) => ((doc && doc.allAttachments().length > 0) ? this.getAttachmentMetaFromDocument(doc) : of([]))));
  }

  getUploadedAttachment(registrationId: string, attachmentId: string): Observable<AttachmentUploadEditModel> {
    return this.getUploadedAttachments(registrationId).pipe(map((result) => result.find((a) => a.id === attachmentId)));
  }

  getBlob(registrationId: string, attachmentId: string): Observable<Blob> {
    return this.getRegistrationOfflineDocumentById(registrationId).pipe(
      filter((doc) => !!doc),
      switchMap((doc) => of(doc.getAttachment(attachmentId))),
      filter((attachment) => !!attachment),
      switchMap((attachment) => from(attachment.getData())));
  }

  removeAttachment(registrationId: string, attachmentId: string): void {
    this.removeAttachment$(registrationId, attachmentId).subscribe();
  }

  removeAttachmentsForRegistration(registrationId: string): void {
    this.removeAttachmentsForRegistration$(registrationId).subscribe();
  }

  removeAttachmentsForRegistration$(registrationId: string): Observable<boolean[]> {
    return this.getUploadedAttachments(registrationId).pipe(
      take(1),
      switchMap((attachments) => attachments.length > 0 ? forkJoin(attachments.map((a) => this.removeAttachment$(registrationId, a.id))) : of([])));
  }

  removeAttachment$(registrationId: string, attachmentId: string): Observable<boolean> {
    return this.getRegistrationAttachmentDocument(registrationId, attachmentId)
      .pipe(take(1), switchMap((a) => from(a.remove())),
        switchMap(() => this.getAttachmentMetaDocument(attachmentId).pipe(take(1), switchMap((metaDoc) => from(metaDoc.remove())))));
  }

  private getRegistrationAttachmentDocument(registrationId: string, attachmentId: string) {
    return this.getRegistrationOfflineDocumentById(registrationId).pipe(
      filter((doc) => !!doc),
      map((doc) => doc.getAttachment(attachmentId)));
  }

  private getAttachmentMetaFromDocument(doc: RxRegistrationDocument) {
    return this.getAttachmentMetaDocumentsFromRegistrationDocument(doc)
      .pipe(map((attachmentMetaDocs) => attachmentMetaDocs.map((mdoc) => mdoc.toJSON())));
  }

  private getAttachmentMetaDocumentsFromRegistrationDocument(doc: RxRegistrationDocument): Observable<RxAttachmentMetaDocument[]> {
    const attachments = doc.allAttachments();
    if(attachments.length <= 0) {
      return of([]);
    }
    return forkJoin(doc.allAttachments().map((attachment) => this.getAttachmentMetaDocument(attachment.id).pipe(take(1))));
  }

  private getAttachmentMetaDocument(id: string): Observable<RxAttachmentMetaDocument> {
    return this.getAttachmentMetaDbCollectionForAppMode().pipe(
      switchMap((collection) => collection.findByIds$([id]).pipe(map((result) => result.get(id)))));
  }

  public saveAttachmentMeta$(attachmentMetaData: AttachmentUploadEditModel): Observable<RxAttachmentMetaDocument> {
    return this.getAttachmentMetaDbCollectionForAppMode().pipe(
      take(1),
      switchMap((dbCollection) => from(dbCollection.atomicUpsert(attachmentMetaData))));
  }

  private getAttachmentMetaDbCollectionForAppMode(): Observable<RxAttachmentMetaCollection> {
    return this.appModeService.appMode$.pipe(map((appMode) => this.getAttachmentMetaDbCollection(appMode)));
  }

  private getAttachmentMetaDbCollection(appMode: AppMode): RxAttachmentMetaCollection {
    return this.offlineDbService.getDbCollection<RxAttachmentMetaCollection>(appMode, TABLE_NAMES.ATTACHMENT_META);
  }

  private getRegistrationOfflineDocumentById(id: string): Observable<RxRegistrationDocument> {
    return this.getRegistrationDbCollectionForAppMode().pipe(
      switchMap((dbCollection) => dbCollection.findByIds$([id])),
      map((result) => result.get(id)));
  }

  private getRegistrationDbCollectionForAppMode(): Observable<RxRegistrationCollection> {
    return this.appModeService.appMode$.pipe(map((appMode) => this.getRegistrationsDbCollection(appMode)));
  }

  private getRegistrationsDbCollection(appMode: AppMode): RxRegistrationCollection {
    return this.offlineDbService.getDbCollection<RxRegistrationCollection>(appMode, TABLE_NAMES.REGISTRATION);
  }
}