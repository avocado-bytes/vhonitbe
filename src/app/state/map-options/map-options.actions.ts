import { createActionGroup, props } from '@ngrx/store';

export const MapOptionsActions = createActionGroup({
  source: 'Map Options',
  events: {
    'Set Distance Rings': props<{ enabled: boolean }>(),
    'Set Tracking': props<{ enabled: boolean }>(),
    'Set Follow Me': props<{ enabled: boolean }>(),
    'Set Wind Cone': props<{ enabled: boolean }>(),
  },
});
