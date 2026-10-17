import { DOCUMENT, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, distinctUntilChanged, EMPTY, exhaustMap, interval, map, Observable, of, switchMap, takeUntil } from 'rxjs';
import { selectTracking } from '../map-options/map-options.reducer';
import { LocationActions } from './location.actions';
import { Coordinates, LocationError } from './location.model';

const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 60_000,
};

/** How often the position is refreshed while tracking, in milliseconds */
const TRACKING_INTERVAL = 10_000;

/** A fresh position for every refresh, given up when the next one is due */
const TRACKING_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: TRACKING_INTERVAL,
  maximumAge: 0,
};

function currentPosition(geolocation: Geolocation | undefined, options = POSITION_OPTIONS): Observable<Coordinates> {
  return new Observable<Coordinates>((subscriber) => {
    if (!geolocation) {
      subscriber.error('unsupported' satisfies LocationError);
      return;
    }
    geolocation.getCurrentPosition(
      ({ coords }) => {
        subscriber.next({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
        subscriber.complete();
      },
      (error) => subscriber.error(toLocationError(error)),
      options,
    );
  });
}

function toLocationError(error: GeolocationPositionError): LocationError {
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return 'denied';
    case 3: // TIMEOUT
      return 'timeout';
    default:
      return 'unavailable';
  }
}

export const locate = createEffect(
  (actions$ = inject(Actions), document = inject(DOCUMENT)) =>
    actions$.pipe(
      ofType(LocationActions.locate),
      exhaustMap(() =>
        currentPosition(document.defaultView?.navigator.geolocation).pipe(
          map((position) => LocationActions.located({ position })),
          catchError((error: LocationError) => of(LocationActions.locateFailed({ error }))),
        ),
      ),
    ),
  { functional: true },
);

/**
 * Refreshes the position regularly until tracking stops, while the user has the tracking option on.
 * Refreshes don't change the status,
 * and a failed one keeps the last known position, so the user isn't interrupted every few seconds.
 */
export const track = createEffect(
  (actions$ = inject(Actions), store = inject(Store), document = inject(DOCUMENT)) =>
    actions$.pipe(
      ofType(LocationActions.startTracking),
      switchMap(() =>
        store.select(selectTracking).pipe(
          distinctUntilChanged(),
          switchMap((enabled) =>
            enabled
              ? interval(TRACKING_INTERVAL).pipe(
                  // A refresh still waiting for the position makes the next one unnecessary
                  exhaustMap(() =>
                    currentPosition(document.defaultView?.navigator.geolocation, TRACKING_OPTIONS).pipe(
                      map((position) => LocationActions.located({ position })),
                      catchError(() => EMPTY),
                    ),
                  ),
                )
              : EMPTY,
          ),
          takeUntil(actions$.pipe(ofType(LocationActions.stopTracking))),
        ),
      ),
    ),
  { functional: true },
);
