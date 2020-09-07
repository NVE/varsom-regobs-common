import { RegistrationTid } from "../../registration.models";
import { RegistrationCard } from "@varsom-regobs-common/regobs-api";
import { ExistingOrNewAttachment } from '../attachment-upload-edit.interface';

export interface RegistrationCardWithAttachments  {
  registrationTid: RegistrationTid;
  registrationName: string;
  registrationCards?: RegistrationCard[];
  attachments?: ExistingOrNewAttachment[];
}