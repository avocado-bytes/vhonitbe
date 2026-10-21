import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { LoadSeries, NewLoadSeries } from '../../model/load-series';

export const HandloadingActions = createActionGroup({
  source: 'Handloading',
  events: {
    Load: emptyProps(),
    'Load Success': props<{ series: LoadSeries[] }>(),
    'Load Failure': props<{ error: string }>(),
    /** Opens the form for a new load development series */
    'Start Add': emptyProps(),
    'Close Form': emptyProps(),
    'Add Series': props<{ series: NewLoadSeries }>(),
    'Add Series Success': props<{ series: LoadSeries }>(),
    'Add Series Failure': props<{ error: string }>(),
  },
});
