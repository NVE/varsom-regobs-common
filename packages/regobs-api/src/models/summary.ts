/* tslint:disable */
import { AdaptiveCard } from './adaptive-card';
import { RegObsGenericValue } from './reg-obs-generic-value';
export interface Summary {
  RegistrationTID?: number;
  RegistrationName?: string;
  AdaptiveCard?: AdaptiveCard;
  Summaries?: Array<RegObsGenericValue>;
}
