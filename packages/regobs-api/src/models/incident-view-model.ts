/* tslint:disable */
import { UrlViewModel } from './url-view-model';
export interface IncidentViewModel {
  GeoHazardName?: string;
  ActivityInfluencedName?: string;
  DamageExtentName?: string;
  ForecastAccurateName?: string;
  IncidentURLs?: Array<UrlViewModel>;
  GeoHazardTID?: number;
  ActivityInfluencedTID?: number;
  DamageExtentTID?: number;
  ForecastAccurateTID?: number;
  DtEndTime?: string;
  IncidentHeader?: string;
  IncidentIngress?: string;
  IncidentText?: string;
  Comment?: string;
}
