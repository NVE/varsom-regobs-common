/* tslint:disable */
import { UrlEditModel } from './url-edit-model';
export interface LandslideEditModel {
  DamageExtentTID?: number;
  LandSlideTID?: number;
  LandSlideSizeTID?: number;
  Comment?: string;
  GeoHazardTID?: number;
  ActivityInfluencedTID?: number;
  ForecastAccurateTID?: number;
  LandSlideTriggerTID?: number;
  StartLat?: number;
  StartLong?: number;
  StopLat?: number;
  StopLong?: number;
  DtLandSlideTime: string;
  DtLandSlideTimeEnd?: string;
  Urls?: Array<UrlEditModel>;
}
