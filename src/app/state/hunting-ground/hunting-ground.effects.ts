import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, concatMap, from, map, merge, Observable, of, switchMap, take } from 'rxjs';
import { GeoPoint } from '../../model/event';
import { HuntingGround, HuntingGroundsResponse, huntingGroundsUrl, toHuntingGrounds } from '../../model/hunting-ground';
import { HuntingGroundStorage } from '../../storage/hunting-ground-storage';
import { LocationActions } from '../location/location.actions';
import { selectPosition } from '../location/location.reducer';
import { HuntingGroundActions } from './hunting-ground.actions';
import { selectGround } from './hunting-ground.reducer';

/** Loads the hunting ground when the application starts, so every map can show its boundary */
export const loadHuntingGroundOnStartup = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() => HuntingGroundActions.load()),
    ),
  { functional: true },
);

export const loadHuntingGround = createEffect(
  (actions$ = inject(Actions), storage = inject(HuntingGroundStorage)) =>
    actions$.pipe(
      ofType(HuntingGroundActions.load),
      switchMap(() =>
        from(storage.get()).pipe(
          map((ground) => HuntingGroundActions.loadSuccess({ ground })),
          catchError((error: unknown) => of(HuntingGroundActions.loadFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

function lookUp(http: HttpClient, point: GeoPoint): Observable<HuntingGround[]> {
  return http
    .get<HuntingGroundsResponse>(huntingGroundsUrl(point))
    .pipe(map((response) => toHuntingGrounds(response, point, new Date())));
}

/**
 * Asks for a fresh position first, then looks up the hunting grounds there.
 * A position set by hand on the map is kept by the location state, so the search can be done from home too.
 */
export const searchHuntingGround = createEffect(
  (actions$ = inject(Actions), store = inject(Store), http = inject(HttpClient)) =>
    actions$.pipe(
      ofType(HuntingGroundActions.search),
      switchMap(() =>
        // Listens before asking, so a position reported right away isn't missed
        merge(
          actions$.pipe(
            ofType(LocationActions.located, LocationActions.locateFailed),
            take(1),
            concatMap(() => store.select(selectPosition).pipe(take(1))),
            switchMap((position) =>
              position
                ? lookUp(http, { latitude: position.latitude, longitude: position.longitude }).pipe(
                    map((candidates) => HuntingGroundActions.searchSuccess({ candidates })),
                    catchError(() => of(HuntingGroundActions.searchFailure({ error: 'service' }))),
                  )
                : of(HuntingGroundActions.searchFailure({ error: 'location' })),
            ),
          ),
          of(LocationActions.locate()),
        ),
      ),
    ),
  { functional: true },
);

export const chooseHuntingGround = createEffect(
  (actions$ = inject(Actions), storage = inject(HuntingGroundStorage)) =>
    actions$.pipe(
      ofType(HuntingGroundActions.choose),
      concatMap(({ ground }) =>
        from(storage.save(ground)).pipe(
          map((saved) => HuntingGroundActions.saveSuccess({ ground: saved })),
          catchError(() => of(HuntingGroundActions.saveFailure({ error: 'storage' }))),
        ),
      ),
    ),
  { functional: true },
);

/** Looks the kept hunting ground up again where it was found, keeping the old boundary when that fails */
export const refreshHuntingGround = createEffect(
  (actions$ = inject(Actions), store = inject(Store), http = inject(HttpClient), storage = inject(HuntingGroundStorage)) =>
    actions$.pipe(
      ofType(HuntingGroundActions.refresh),
      concatMap(() => store.select(selectGround).pipe(take(1))),
      switchMap((current) => {
        if (!current) {
          return of(HuntingGroundActions.saveFailure({ error: 'missing' }));
        }
        return lookUp(http, current.searchedAt).pipe(
          catchError(() => of(null)),
          switchMap((grounds) => {
            if (!grounds) {
              return of(HuntingGroundActions.saveFailure({ error: 'service' }));
            }
            const ground = grounds.find(({ code }) => code === current.code);
            if (!ground) {
              return of(HuntingGroundActions.saveFailure({ error: 'missing' }));
            }
            return from(storage.save(ground)).pipe(
              map((saved) => HuntingGroundActions.saveSuccess({ ground: saved })),
              catchError(() => of(HuntingGroundActions.saveFailure({ error: 'storage' }))),
            );
          }),
        );
      }),
    ),
  { functional: true },
);

export const removeHuntingGround = createEffect(
  (actions$ = inject(Actions), storage = inject(HuntingGroundStorage)) =>
    actions$.pipe(
      ofType(HuntingGroundActions.remove),
      concatMap(() =>
        from(storage.remove()).pipe(
          map(() => HuntingGroundActions.removeSuccess()),
          catchError((error: unknown) => of(HuntingGroundActions.removeFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);
