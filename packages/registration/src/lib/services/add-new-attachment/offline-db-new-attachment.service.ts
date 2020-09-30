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

  addAttachment(id: string, data: Blob, mimeType: string, geoHazard: GeoHazard, registrationTid: RegistrationTid, type?: AttachmentType, ref?: string): void {
    const attachmentId = uuidv4();
    this.getRegistrationOfflineDocumentById(id).pipe(take(1), switchMap((doc) =>
      this.saveAttachmentMetaObservable({
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

  saveAttachmentMeta(id: string, meta: AttachmentUploadEditModel): void {
    this.saveAttachmentMetaObservable(meta).pipe(catchError((err) => {
      this.loggerService.error(() => 'Could not save attachment metadata', err);
      return EMPTY;
    })).subscribe();
  }

  getUploadedAttachments(id: string): Observable<AttachmentUploadEditModel[]> {
    return this.getRegistrationOfflineDocumentById(id).pipe(
      switchMap((doc) => (doc ? this.getAttachmentMetaFromDocument(doc) : of([]))));
  }

  getBlob(id: string, meta: AttachmentUploadEditModel): Observable<Blob> {
    return this.getRegistrationOfflineDocumentById(id).pipe(
      filter((doc) => !!doc),
      switchMap((doc) => of(doc.getAttachment(meta.id))),
      filter((attachment) => !!attachment),
      switchMap((attachment) => from(attachment.getData())));
  }

  removeAttachment(id: string, attachmentId: string): void {
    this.removeAttachment$(id, attachmentId).subscribe();
  }

  removeAttachmentsForRegistration(id: string): void {
    this.getUploadedAttachments(id).pipe(
      take(1),
      switchMap((attachments) => forkJoin(attachments.map((a) => this.removeAttachment$(id, a.id)))))
      .subscribe();
  }

  removeAttachment$(id: string, attachmentId: string): Observable<boolean> {
    return this.getRegistrationAttachmentDocument(id, attachmentId)
      .pipe(take(1), switchMap((a) => from(a.remove())),
        switchMap(() => this.getAttachmentMetaDocument(attachmentId).pipe(take(1), switchMap((metaDoc) => from(metaDoc.remove())))));
  }

  private getRegistrationAttachmentDocument(id: string, attachmentId: string) {
    return this.getRegistrationOfflineDocumentById(id).pipe(
      filter((doc) => !!doc),
      map((doc) => doc.getAttachment(attachmentId)));
  }

  private getAttachmentMetaFromDocument(doc: RxRegistrationDocument) {
    return this.getAttachmentMetaDocumentsFromRegistrationDocument(doc)
      .pipe(map((attachmentMetaDocs) => attachmentMetaDocs.map((mdoc) => mdoc.toJSON())));
  }

  private getAttachmentMetaDocumentsFromRegistrationDocument(doc: RxRegistrationDocument) {
    return forkJoin(doc.allAttachments().map((attachment) => this.getAttachmentMetaDocument(attachment.id).pipe(take(1))));
  }

  private getAttachmentMetaDocument(id: string): Observable<RxAttachmentMetaDocument> {
    return this.getAttachmentMetaDbCollectionForAppMode().pipe(
      switchMap((collection) => collection.findByIds$([id]).pipe(map((result) => result.get(id)))));
  }

  private saveAttachmentMetaObservable(attachmentMetaData: AttachmentUploadEditModel) {
    return this.getAttachmentMetaDbCollectionForAppMode().pipe(
      take(1),
      switchMap((dbCollection) => from(dbCollection.upsert(attachmentMetaData))));
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