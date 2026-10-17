import { GeoPoint } from '../model/event';
import { BackstopOverlay } from '../state/shooting-safety/shooting-safety.model';
import { BackstopOptions } from './backstop';

/** Sent to the backstop worker */
export interface BackstopRequest {
  origin: GeoPoint;
  options: BackstopOptions;
}

/** Sent back by the backstop worker; an overlay that isn't `final` is followed by an updated one */
export type BackstopResponse = { overlay: BackstopOverlay; final: boolean } | { error: string };
