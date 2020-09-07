/* tslint:disable */
import { AdaptiveFallbackElement } from './adaptive-fallback-element';
export interface AdaptiveAction {
  type?: string;
  id?: string;
  title?: string;
  speak?: string;
  iconUrl?: string;
  style?: string;
  fallback?: AdaptiveFallbackElement;
  requires?: {[key: string]: string};
}
