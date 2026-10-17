import { createActionGroup, props } from '@ngrx/store';

export const MapOptionsActions = createActionGroup({
  source: 'Map Options',
  events: {
    'Set Distance Rings': props<{ enabled: boolean }>(),
  },
});
