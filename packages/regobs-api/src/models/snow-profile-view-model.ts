/* tslint:disable */
import { StratProfileViewModel } from './strat-profile-view-model';
import { SnowTempModel } from './snow-temp-model';
import { SnowDensityModel } from './snow-density-model';
export interface SnowProfileViewModel {
  TotalDepth?: number;
  StratProfile?: StratProfileViewModel;
  Comment?: string;
  IsProfileToGround?: boolean;
  SnowTemp?: SnowTempModel;
  SnowDensity?: Array<SnowDensityModel>;
}
