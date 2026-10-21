import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Ammunition } from '../../model/ammunition';
import { LoadSeries, NewLoadSeries, TestLoad } from '../../model/load-series';

export const HandloadingActions = createActionGroup({
  source: 'Handloading',
  events: {
    Load: emptyProps(),
    'Load Success': props<{ series: LoadSeries[] }>(),
    'Load Failure': props<{ error: string }>(),
    /** Opens the form for a new load development series */
    'Start Add': emptyProps(),
    /** Opens the form for the details of an existing series */
    'Start Edit': props<{ series: LoadSeries }>(),
    /** Opens the form for a new test load of a series */
    'Start Add Load': props<{ seriesId: string }>(),
    /** Opens the form for an existing test load of a series */
    'Start Edit Load': props<{ seriesId: string; load: TestLoad }>(),
    'Close Form': emptyProps(),
    'Add Series': props<{ series: NewLoadSeries }>(),
    'Add Series Success': props<{ series: LoadSeries }>(),
    'Add Series Failure': props<{ error: string }>(),
    /** Saves the details of a series, and also adding, changing or deleting one of its test loads */
    'Update Series': props<{ series: LoadSeries }>(),
    'Update Series Success': props<{ series: LoadSeries }>(),
    'Update Series Failure': props<{ error: string }>(),
    'Delete Series': props<{ id: string }>(),
    'Delete Series Success': props<{ id: string }>(),
    'Delete Series Failure': props<{ id: string; error: string }>(),
    /** Copies a test load into the ammunition list as a handload */
    'Promote Load': props<{ series: LoadSeries; loadId: string }>(),
    'Promote Load Success': props<{ series: LoadSeries; ammunition: Ammunition }>(),
    'Promote Load Failure': props<{ loadId: string; error: string }>(),
  },
});
