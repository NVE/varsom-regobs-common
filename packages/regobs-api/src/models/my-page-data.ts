/* tslint:disable */
import { ObserverGroupDto } from './observer-group-dto';
import { ObserverCompetenceDto } from './observer-competence-dto';
export interface MyPageData {
  DtRegTime?: string;
  Guid?: string;
  Email?: string;
  MobPhoneNr?: string;
  FirstName?: string;
  LastName?: string;
  WorkPlace?: string;
  Adrnr?: number;
  NickName?: string;
  MemberOfGroups?: Array<ObserverGroupDto>;
  PendingInvitationsToGroups?: Array<ObserverGroupDto>;
  Competence?: Array<ObserverCompetenceDto>;
  NumberOfObservations?: number;
  MainGeohazardTID?: number;
  LastRegistrationDate?: string;
  DefaultMunicipality?: string;
}
