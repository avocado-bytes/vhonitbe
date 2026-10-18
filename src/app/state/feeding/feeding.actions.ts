import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { EventSort, HuntingEvent } from '../../model/event';
import { FeedingItem } from '../../model/item';

export const FeedingActions = createActionGroup({
  source: 'Feeding',
  events: {
    Load: emptyProps(),
    'Load Success': props<{ events: HuntingEvent[] }>(),
    'Load Failure': props<{ error: string }>(),
    'Set Sort': props<{ sort: EventSort }>(),
    /** null shows all feeding items */
    'Set Item': props<{ item: FeedingItem | null }>(),
    'Go To Page': props<{ pageIndex: number }>(),
  },
});
