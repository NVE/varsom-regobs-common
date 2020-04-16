import { AddNewAttachmentService } from './add-new-attachment.service';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, ReplaySubject } from 'rxjs';
import { AttachmentUploadEditModel } from '../../registration.models';
import { map, switchMap, take } from 'rxjs/operators';
import { getBlobFromUrl } from '../../helpers/object-url-blob.helper';
@Injectable()
export class InMemoryAddNewAttachmentService implements AddNewAttachmentService {

  private readonly _addedAttachmets: BehaviorSubject<{ id: string; attachment: AttachmentUploadEditModel }[]>;
  private readonly _attachmentChangeTrigger: ReplaySubject<string>;

  get attachmentsToUpload$() {
    return this._addedAttachmets.asObservable();
  }

  get attachmentsChanged$() {
    return this._attachmentChangeTrigger.pipe(switchMap((id) =>
      this.getUploadedAttachments(id).pipe(take(1), map((attachments) => ({id, attachments})))));
  }

  constructor() {
    this._addedAttachmets = new BehaviorSubject<{
      id: string;
      attachment: AttachmentUploadEditModel;
    }[]>([]);
    this._attachmentChangeTrigger = new ReplaySubject<string>();
  }

  setAttachmentUpload(id: string, attachment: AttachmentUploadEditModel) {
    if(id && attachment) {
      this.addOrUpdateCurrentVal(id, attachment);
      this._addedAttachmets.next(this._addedAttachmets.value);
      this._attachmentChangeTrigger.next(id);
    }
  }

  private addOrUpdateCurrentVal(id: string, attachment: AttachmentUploadEditModel) {
    const existingItem = this._addedAttachmets.value.find((x) => x.id === id && x.attachment.fileUrl === attachment.fileUrl);
    if(existingItem) {
      existingItem.attachment = attachment;
    }else{
      this._addedAttachmets.value.push({ id, attachment });
    }
  }

  setAttachmentUploads(id: string, attachments: AttachmentUploadEditModel[]) {
    if(id && attachments) {
      for(const attachment of attachments) {
        this.addOrUpdateCurrentVal(id, attachment);
      }
      this._addedAttachmets.next(this._addedAttachmets.value);
      this._attachmentChangeTrigger.next(id);
    }
  }

  getUploadedAttachments(id: string): Observable<AttachmentUploadEditModel[]> {
    return this._addedAttachmets
      .pipe(map((attachments) => attachments.filter((a) => a.id === id).map((a) => a.attachment)));
  }

  getBlob(id: string, attachment: AttachmentUploadEditModel): Observable<Blob> {
    return from(getBlobFromUrl(attachment.fileUrl));
  }

  removeAttachment(id: string, attachment: AttachmentUploadEditModel) {
    this.revokeObjectURL(attachment);
    this._addedAttachmets.next(this._addedAttachmets.value.filter((a) => a.attachment.fileUrl !== attachment.fileUrl));
    this._attachmentChangeTrigger.next(id);
  }

  removeAttachmentsForRegistration(id: string) {
    const added = this._addedAttachmets.value.filter((a) => a.id === id);
    for(const a of added) {
      this.revokeObjectURL(a.attachment);
    }
    this._addedAttachmets.next(this._addedAttachmets.value.filter((a) => a.id !== id));
    this._attachmentChangeTrigger.next(id);
  }

  removeAll() {
    const uniqueIds = [...new Set(this._addedAttachmets.value.map((x) => x.id))];
    for(const a of this._addedAttachmets.value) {
      this.revokeObjectURL(a.attachment);
    }
    this._addedAttachmets.next([]);
    for(const id of uniqueIds) {
      this._attachmentChangeTrigger.next(id);
    }
  }

  private revokeObjectURL(attachment: AttachmentUploadEditModel) {
    if(attachment && attachment.fileUrl && attachment.fileUrl.startsWith('blob')) {
      URL.revokeObjectURL(attachment.fileUrl);
    }
  }
}