import { AttachmentEditModel, AttachmentViewModel } from '@varsom-regobs-common/regobs-api';

export interface AttachmentUploadEditModel extends AttachmentEditModel {
  type?: 'Attachment' | 'DamageObsAttachment' | 'WaterLevelMeasurementAttachment';
  fileUrl?: string;
  fileSize?: number;
  error?: Error;
  ref?: string;  // Guid
}

export type ExistingOrNewAttachment = AttachmentUploadEditModel | AttachmentViewModel;