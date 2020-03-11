import { AttachmentEditModel, AttachmentViewModel } from '@varsom-regobs-common/regobs-api';

export interface AttachmentUploadEditModel extends AttachmentEditModel {
  fileUrl?: string;
  fileSize?: number;
  error?: Error;
}

export type ExistingOrNewAttachment = AttachmentUploadEditModel | AttachmentViewModel;