/* tslint:disable */
import { UrlViewModel } from './url-view-model';
export interface IncidentViewModel {
  DamageExtentTID?: number;
  GeoHazardName?: string;
  DamageExtentName?: string;
  ForecastAccurateName?: string;
  IncidentURLs?: Array<UrlViewModel>;
  GeoHazardTID?: number;
  ActivityInfluencedTID?: number;
  ActivityInfluencedName?: string;
  ForecastAccurateTID?: number;
  DtEndTime?: string;
  IncidentHeader?: string;
  IncidentIngress?: string;
  IncidentText?: string;
  Comment?: string;
}
