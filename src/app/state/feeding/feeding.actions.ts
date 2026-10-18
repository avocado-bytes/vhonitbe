import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { FeedingPlace, FeedingPlaceType, NewFeedingPlace } from '../../model/feeding-place';
import { ShareResult } from '../../shared/share-event';

export const FeedingActions = createActionGroup({
  source: 'Feeding',
  events: {
    Load: emptyProps(),
    'Load Success': props<{ places: FeedingPlace[] }>(),
    'Load Failure': props<{ error: string }>(),
    /** null shows all feeding places */
    'Set Type': props<{ placeType: FeedingPlaceType | null }>(),
    'Go To Page': props<{ pageIndex: number }>(),
    /** Opens the form for a new feeding place */
    'Start Add': emptyProps(),
    /** Opens the form for an existing feeding place */
    'Start Edit': props<{ place: FeedingPlace }>(),
    'Close Form': emptyProps(),
    'Add Place': props<{ place: NewFeedingPlace }>(),
    'Add Place Success': props<{ place: FeedingPlace }>(),
    'Add Place Failure': props<{ error: string }>(),
    'Update Place': props<{ place: FeedingPlace }>(),
    'Update Place Success': props<{ place: FeedingPlace }>(),
    'Update Place Failure': props<{ error: string }>(),
    'Delete Place': props<{ id: string }>(),
    'Delete Place Success': props<{ id: string }>(),
    'Delete Place Failure': props<{ id: string; error: string }>(),
    /** Records that the place was replenished just now */
    'Replenish Place': props<{ place: FeedingPlace }>(),
    'Replenish Place Success': props<{ place: FeedingPlace }>(),
    'Replenish Place Failure': props<{ id: string; error: string }>(),
    'Share Place': props<{ place: FeedingPlace }>(),
    'Share Place Success': props<{ result: ShareResult }>(),
    'Share Place Failure': props<{ error: string }>(),
    /** Months are 1–12; the end month may come before the start month for a season spanning the new year */
    'Set Season': props<{ seasonStart: number; seasonEnd: number }>(),
    'Set Replenish Days': props<{ replenishDays: number }>(),
  },
});
