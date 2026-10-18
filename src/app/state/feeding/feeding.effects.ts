import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { FEEDING_ITEMS } from '../../model/item';
import { EventStorage } from '../../storage/event-storage';
import { EventsActions } from '../events/events.actions';
import { FeedingActions } from './feeding.actions';

export const loadFeeding = createEffect(
  (actions$ = inject(Actions), storage = inject(EventStorage)) =>
    actions$.pipe(
      ofType(FeedingActions.load),
      switchMap(() =>
        from(Promise.all(FEEDING_ITEMS.map((type) => storage.getByType(type)))).pipe(
          map((byType) =>
            FeedingActions.loadSuccess({
              // ISO dates sort chronologically as strings
              events: byType.flat().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
            }),
          ),
          catchError((error: unknown) => of(FeedingActions.loadFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

/** Keeps the feeding places current after any change, also one to or from a feeding type */
export const reloadFeedingAfterChange = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(EventsActions.addEventSuccess, EventsActions.updateEventSuccess, EventsActions.deleteEventSuccess),
      map(() => FeedingActions.load()),
    ),
  { functional: true },
);
