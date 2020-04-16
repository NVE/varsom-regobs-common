import { Observable } from 'rxjs';
import { AttachmentUploadEditModel } from '../../registration.models';

export abstract class AddNewAttachmentService {
  abstract setAttachmentUpload(id: string, attachment: AttachmentUploadEditModel);
  abstract setAttachmentUploads(id: string, attachments: AttachmentUploadEditModel[]);
  abstract getUploadedAttachments(id: string): Observable<AttachmentUploadEditModel[]>;
  abstract getBlob(id: string, attachment: AttachmentUploadEditModel): Observable<Blob>;
  abstract removeAttachment(id: string, attachment: AttachmentUploadEditModel);
  abstract removeAttachmentsForRegistration(id: string);
  abstract removeAll();
  abstract attachmentsToUpload$: Observable<{ id: string; attachment: AttachmentUploadEditModel }[]>;
  abstract attachmentsChanged$: Observable<{ id: string; attachments: AttachmentUploadEditModel[] }>;
}
