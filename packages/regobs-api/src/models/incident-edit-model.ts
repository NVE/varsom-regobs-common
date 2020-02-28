/* tslint:disable */
import { UrlEditModel } from './url-edit-model';
export interface IncidentEditModel {
  GeoHazardTID?: number;
  ActivityInfluencedTID?: number;
  DamageExtentTID?: number;
  ForecastAccurateTID?: number;
  DtEndTime?: string;
  IncidentHeader?: string;
  IncidentIngress?: string;
  IncidentText?: string;
  Comment?: string;
  IncidentURLs?: Array<UrlEditModel>;
}
