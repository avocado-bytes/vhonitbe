/** An image of the backstop analysis and the south-west / north-east corners it covers */
export interface BackstopOverlay {
  /** PNG data url */
  image: string;
  bounds: [[number, number], [number, number]];
}

export type ShootingSafetyStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ShootingSafetyState {
  enabled: boolean;
  status: ShootingSafetyStatus;
  overlay: BackstopOverlay | null;
  error: string | null;
}
