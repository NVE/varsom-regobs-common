/* tslint:disable */
import { UrlEditModel } from './url-edit-model';
export interface GeneralObservationEditModel {
  GeoHazardTID?: number;
  ObsComment?: string;
  ObsHeader?: string;
  Comment?: string;
  Urls?: Array<UrlEditModel>;
}
