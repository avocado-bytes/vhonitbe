import { DOCUMENT, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { TranslateService } from '@ngx-translate/core';
import { catchError, concatMap, exhaustMap, from, map, mergeMap, of, switchMap } from 'rxjs';
import { placeShareText, sharedPhoto, shareText, ShareResult } from '../../shared/share-event';
import { EventStorage } from '../../storage/event-storage';
import { FeedingPlaceStorage } from '../../storage/feeding-place-storage';
import { FeedingActions } from './feeding.actions';

export const loadFeeding = createEffect(
  (actions$ = inject(Actions), storage = inject(FeedingPlaceStorage)) =>
    actions$.pipe(
      ofType(FeedingActions.load),
      switchMap(() =>
        from(storage.getAll()).pipe(
          map((places) => FeedingActions.loadSuccess({ places })),
          catchError((error: unknown) => of(FeedingActions.loadFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

/** Keeps the list and the map current after any change */
export const reloadFeedingAfterChange = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(FeedingActions.addPlaceSuccess, FeedingActions.updatePlaceSuccess, FeedingActions.deletePlaceSuccess),
      map(() => FeedingActions.load()),
    ),
  { functional: true },
);

export const addPlace = createEffect(
  (actions$ = inject(Actions), storage = inject(FeedingPlaceStorage)) =>
    actions$.pipe(
      ofType(FeedingActions.addPlace),
      concatMap(({ place }) =>
        from(storage.add(place)).pipe(
          map((stored) => FeedingActions.addPlaceSuccess({ place: stored })),
          catchError((error: unknown) => of(FeedingActions.addPlaceFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const updatePlace = createEffect(
  (actions$ = inject(Actions), storage = inject(FeedingPlaceStorage)) =>
    actions$.pipe(
      ofType(FeedingActions.updatePlace),
      concatMap(({ place }) =>
        from(storage.update(place)).pipe(
          map((stored) => FeedingActions.updatePlaceSuccess({ place: stored })),
          catchError((error: unknown) => of(FeedingActions.updatePlaceFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const deletePlace = createEffect(
  (actions$ = inject(Actions), storage = inject(FeedingPlaceStorage)) =>
    actions$.pipe(
      ofType(FeedingActions.deletePlace),
      mergeMap(({ id }) =>
        from(storage.delete(id)).pipe(
          map(() => FeedingActions.deletePlaceSuccess({ id })),
          catchError((error: unknown) => of(FeedingActions.deletePlaceFailure({ id, error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

/** Shares a feeding place as a text message with a link to its location and its photo attached */
export const sharePlace = createEffect(
  (
    actions$ = inject(Actions),
    storage = inject(EventStorage),
    translate = inject(TranslateService),
    navigator = inject(DOCUMENT).defaultView?.navigator,
  ) =>
    actions$.pipe(
      ofType(FeedingActions.sharePlace),
      // Only one share sheet can be open at a time
      exhaustMap(({ place }) => {
        const share = async (): Promise<ShareResult> => {
          if (!navigator) {
            throw new Error('Sharing is not supported');
          }
          return shareText(navigator, placeShareText(place, translate), await sharedPhoto(place.photoId, place.type, storage));
        };
        return from(share()).pipe(
          map((result) => FeedingActions.sharePlaceSuccess({ result })),
          catchError((error: unknown) => of(FeedingActions.sharePlaceFailure({ error: String(error) }))),
        );
      }),
    ),
  { functional: true },
);
