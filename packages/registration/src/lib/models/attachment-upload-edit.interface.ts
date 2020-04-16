import { AttachmentEditModel, AttachmentViewModel, DamageObsEditModel, WaterLevelMeasurementEditModel } from '@varsom-regobs-common/regobs-api';

export interface AttachmentUploadEditModel extends AttachmentEditModel {
  type?: 'Attachment' | 'DamageObsAttachment' | 'WaterLevelMeasurementAttachment';
  fileUrl?: string;
  fileSize?: number;
  error?: Error;
  ref?: DamageObsEditModel | WaterLevelMeasurementEditModel;
}

export type ExistingOrNewAttachment = AttachmentUploadEditModel | AttachmentViewModel;