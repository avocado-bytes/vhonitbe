import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { HuntingGround } from '../../model/hunting-ground';
import { HuntingGroundError } from './hunting-ground.model';

export const HuntingGroundActions = createActionGroup({
  source: 'Hunting Ground',
  events: {
    Load: emptyProps(),
    'Load Success': props<{ ground: HuntingGround | null }>(),
    'Load Failure': props<{ error: string }>(),
    /** Looks up the hunting grounds at the user's position, which may also be one set by hand on the map */
    Search: emptyProps(),
    'Search Success': props<{ candidates: HuntingGround[] }>(),
    'Search Failure': props<{ error: HuntingGroundError }>(),
    'Cancel Search': emptyProps(),
    /** Keeps one of the hunting grounds found */
    Choose: props<{ ground: HuntingGround }>(),
    /** Downloads the boundary of the kept hunting ground again */
    Refresh: emptyProps(),
    'Save Success': props<{ ground: HuntingGround }>(),
    'Save Failure': props<{ error: HuntingGroundError }>(),
    Remove: emptyProps(),
    'Remove Success': emptyProps(),
    'Remove Failure': props<{ error: string }>(),
  },
});
