/* tslint:disable */
import { UrlEditModel } from './url-edit-model';
export interface LandslideEditModel {
  LandSlideTID?: number;
  LandSlideTriggerTID?: number;
  LandSlideSizeTID?: number;
  Comment?: string;
  GeoHazardTID?: number;
  ActivityInfluencedTID?: number;
  ForecastAccurateTID?: number;
  DamageExtentTID?: number;
  StartLat?: number;
  StartLong?: number;
  StopLat?: number;
  StopLong?: number;
  DtLandSlideTime: string;
  DtLandSlideTimeEnd?: string;
  Urls?: Array<UrlEditModel>;
}
