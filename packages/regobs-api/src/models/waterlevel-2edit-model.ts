/* tslint:disable */
import { WaterLevelMeasurementEditModel } from './water-level-measurement-edit-model';
export interface Waterlevel2EditModel {
  MarkingReferenceTID?: number;
  WaterAstrayTID?: number;
  MeasurementReferenceTID?: number;
  MeasurementTypeTID?: number;
  WaterLevelMethodTID?: number;
  ObservationTimingTID?: number;
  WaterLevelStateTID?: number;
  MarkingTypeTID?: number;
  MeasuringToolDescription?: string;
  WaterLevelMeasurement?: Array<WaterLevelMeasurementEditModel>;
  Comment?: string;
}
