/* tslint:disable */
import { UrlViewModel } from './url-view-model';
export interface GeneralObservationViewModel {
  GeoHazardName?: string;
  Urls?: Array<UrlViewModel>;
  GeoHazardTID?: number;
  ObsComment?: string;
  ObsHeader?: string;
  Comment?: string;
}
