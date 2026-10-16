import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Coordinates, LocationError } from './location.model';

export const LocationActions = createActionGroup({
  source: 'Location',
  events: {
    Locate: emptyProps(),
    Located: props<{ position: Coordinates }>(),
    'Locate Failed': props<{ error: LocationError }>(),
  },
});
