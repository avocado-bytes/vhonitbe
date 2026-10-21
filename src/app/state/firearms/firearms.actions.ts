import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Firearm, NewFirearm } from '../../model/firearm';

export const FirearmsActions = createActionGroup({
  source: 'Firearms',
  events: {
    Load: emptyProps(),
    'Load Success': props<{ firearms: Firearm[] }>(),
    'Load Failure': props<{ error: string }>(),
    /** Opens the form for a new firearm */
    'Start Add': emptyProps(),
    /** Opens the form for an existing firearm */
    'Start Edit': props<{ firearm: Firearm }>(),
    'Close Form': emptyProps(),
    'Add Firearm': props<{ firearm: NewFirearm }>(),
    'Add Firearm Success': props<{ firearm: Firearm }>(),
    'Add Firearm Failure': props<{ error: string }>(),
    'Update Firearm': props<{ firearm: Firearm }>(),
    'Update Firearm Success': props<{ firearm: Firearm }>(),
    'Update Firearm Failure': props<{ error: string }>(),
    'Delete Firearm': props<{ id: string }>(),
    'Delete Firearm Success': props<{ id: string }>(),
    'Delete Firearm Failure': props<{ id: string; error: string }>(),
  },
});
