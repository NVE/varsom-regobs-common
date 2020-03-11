import { Summary } from '@varsom-regobs-common/regobs-api';
import { ExistingOrNewAttachment } from '../attachment-upload-edit.interface';
import { RegistrationTid } from '../registration-tid.enum';

export interface SummariesWithAttachments  {
  registrationTid: RegistrationTid;
  registrationName?: string;
  summaries: Summary[];
  attachments: ExistingOrNewAttachment[];
}