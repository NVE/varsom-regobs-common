import { AttachmentEditModel, AttachmentViewModel } from '@varsom-regobs-common/regobs-api';

export interface AttachmentUploadEditModel extends AttachmentEditModel {
  id: string;
  type?: AttachmentType;
  // fileUrl?: string;
  fileSize?: number;
  error?: Error;
  ref?: string;  // Guid
}

export type ExistingOrNewAttachment = AttachmentUploadEditModel | AttachmentViewModel;

export type AttachmentType = 'Attachment' | 'DamageObsAttachment' | 'WaterLevelMeasurementAttachment';