import { Observable } from 'rxjs';
import { GeoHazard } from '@varsom-regobs-common/core';
import { AttachmentType, AttachmentUploadEditModel, RegistrationTid } from '../../registration.models';

export abstract class NewAttachmentService {
  // abstract setAttachmentUpload(id: string, attachment: AttachmentUploadEditModel);
  // abstract setAttachmentUploads(id: string, attachments: AttachmentUploadEditModel[]);
  abstract addAttachment(id: string, data: Blob, mimeType: string, geoHazard: GeoHazard, registrationTid: RegistrationTid, type?: AttachmentType, ref?: string): void;
  abstract saveAttachmentMeta$(meta: AttachmentUploadEditModel): Observable<unknown>;
  abstract saveAttachmentMeta(meta: AttachmentUploadEditModel): void;
  abstract getUploadedAttachments(id: string): Observable<AttachmentUploadEditModel[]>;
  abstract getBlob(id: string, attachment: AttachmentUploadEditModel): Observable<Blob>;
  abstract removeAttachment(id: string, attachmentId: string): void;
  abstract removeAttachment$(id: string, attachmentId: string): Observable<boolean>;
  abstract removeAttachmentsForRegistration(id: string): void;
  abstract removeAttachmentsForRegistration$(id: string): Observable<boolean[]>;
  // abstract removeAllAttachments(id: string);
  // abstract newAttachments$: Observable<{ id: string; attachment: AttachmentUploadEditModel }[]>;
  // abstract attachmentsChanged$: Observable<{ id: string; attachments: AttachmentUploadEditModel[] }>;
}
