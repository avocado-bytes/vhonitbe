import { DOCUMENT, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, Observable, of } from 'rxjs';
import { LocationActions } from './location.actions';
import { Coordinates, LocationError } from './location.model';

const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 60_000,
};

function currentPosition(geolocation: Geolocation | undefined): Observable<Coordinates> {
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
      POSITION_OPTIONS,
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
