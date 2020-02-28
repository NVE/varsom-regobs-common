/* tslint:disable */
import { IceThicknessLayerEditModel } from './ice-thickness-layer-edit-model';
export interface IceThicknessEditModel {
  SnowDepth?: number;
  SlushSnow?: number;
  IceThicknessSum?: number;
  IceHeightBefore?: number;
  IceHeightAfter?: number;
  Comment?: string;
  IceThicknessLayers?: Array<IceThicknessLayerEditModel>;
}
