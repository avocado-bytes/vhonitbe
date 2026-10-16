export interface Coordinates {
  latitude: number;
  longitude: number;
  /** Accuracy radius in meters */
  accuracy: number;
}

export type LocationStatus = 'idle' | 'locating' | 'located' | 'error';

export type LocationError = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export interface LocationState {
  status: LocationStatus;
  position: Coordinates | null;
  error: LocationError | null;
}
