import { Summary } from '@varsom-regobs-common/regobs-api';
import { ExistingOrNewAttachment } from '../attachment-upload-edit.interface';
import { RegistrationTid } from '../registration-tid.enum';

export interface SummaryWithAttachments  {
  registrationTid: RegistrationTid;
  registrationName?: string;
  summaries: Summary[];
  attachments: ExistingOrNewAttachment[];
}