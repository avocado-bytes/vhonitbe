import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Ammunition, NewAmmunition } from '../../model/ammunition';

export const AmmunitionActions = createActionGroup({
  source: 'Ammunition',
  events: {
    Load: emptyProps(),
    'Load Success': props<{ ammunition: Ammunition[] }>(),
    'Load Failure': props<{ error: string }>(),
    'Add Ammunition': props<{ ammunition: NewAmmunition }>(),
    'Add Ammunition Success': props<{ ammunition: Ammunition }>(),
    'Add Ammunition Failure': props<{ error: string }>(),
    /** Opens the shared add dialog for existing ammunition */
    'Start Edit': props<{ ammunition: Ammunition }>(),
    'Update Ammunition': props<{ ammunition: Ammunition }>(),
    'Update Ammunition Success': props<{ ammunition: Ammunition }>(),
    'Update Ammunition Failure': props<{ error: string }>(),
    'Delete Ammunition': props<{ id: string }>(),
    'Delete Ammunition Success': props<{ id: string }>(),
    'Delete Ammunition Failure': props<{ id: string; error: string }>(),
  },
});
