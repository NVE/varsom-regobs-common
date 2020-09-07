/* tslint:disable */
import { AdaptiveHeight } from './adaptive-height';
import { AdaptiveSchemaVersion } from './adaptive-schema-version';
import { AdaptiveBackgroundImage } from './adaptive-background-image';
import { AdaptiveElement } from './adaptive-element';
import { AdaptiveAction } from './adaptive-action';
import { AdaptiveFallbackElement } from './adaptive-fallback-element';
export interface AdaptiveCard {
  height?: AdaptiveHeight;
  type?: string;
  minVersion?: AdaptiveSchemaVersion;
  id?: string;
  fallbackText?: string;
  speak?: string;
  lang?: string;
  title?: string;
  backgroundImage?: AdaptiveBackgroundImage;
  version?: AdaptiveSchemaVersion;
  body?: Array<AdaptiveElement>;
  actions?: Array<AdaptiveAction>;
  minHeight?: number;
  $schema?: string;
  verticalContentAlignment?: 'top' | 'center' | 'bottom';
  selectAction?: AdaptiveAction;
  fallback?: AdaptiveFallbackElement;
  requires?: {[key: string]: string};
}
