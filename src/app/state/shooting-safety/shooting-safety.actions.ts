import { createActionGroup, props } from '@ngrx/store';
import { BackstopOverlay } from './shooting-safety.model';

export const ShootingSafetyActions = createActionGroup({
  source: 'Shooting Safety',
  events: {
    'Set Enabled': props<{ enabled: boolean }>(),
    'Analyze Success': props<{ overlay: BackstopOverlay }>(),
    'Analyze Failure': props<{ error: string }>(),
  },
});
