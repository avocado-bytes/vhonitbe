import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { EventQuery, GeoPoint, HuntingEvent, NewHuntingEvent } from '../../model/event';

export const EventsActions = createActionGroup({
  source: 'Events',
  events: {
    'Load Page': props<{ pageIndex: number }>(),
    'Set Query': props<{ query: EventQuery }>(),
    'Load Page Success': props<{ pageIndex: number; events: HuntingEvent[]; total: number }>(),
    'Load Page Failure': props<{ error: string }>(),
    'Load Latest': emptyProps(),
    'Load Latest Success': props<{ events: HuntingEvent[] }>(),
    'Load Latest Failure': props<{ error: string }>(),
    'Add Event': props<{ event: NewHuntingEvent }>(),
    'Add Event Success': props<{ event: HuntingEvent }>(),
    'Add Event Failure': props<{ error: string }>(),
    'Start Add': props<{ location: GeoPoint }>(),
    'Cancel Add': emptyProps(),
    'Start Edit': props<{ event: HuntingEvent }>(),
    'Cancel Edit': emptyProps(),
    'Update Event': props<{ event: HuntingEvent }>(),
    'Update Event Success': props<{ event: HuntingEvent }>(),
    'Update Event Failure': props<{ error: string }>(),
    'Delete Event': props<{ id: string }>(),
    'Delete Event Success': props<{ id: string }>(),
    'Delete Event Failure': props<{ id: string; error: string }>(),
  },
});
