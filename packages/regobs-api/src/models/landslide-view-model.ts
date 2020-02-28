/* tslint:disable */
import { UrlViewModel } from './url-view-model';
export interface LandslideViewModel {
  LandSlideName?: string;
  LandSlideTriggerName?: string;
  LandSlideSizeName?: string;
  GeoHazardName?: string;
  ActivityInfluencedName?: string;
  ForecastAccurateName?: string;
  DamageExtentName?: string;
  Urls?: Array<UrlViewModel>;
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
}
