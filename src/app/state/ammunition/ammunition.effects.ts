import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, from, map, mergeMap, of, switchMap } from 'rxjs';
import { AmmunitionStorage } from '../../storage/ammunition-storage';
import { AmmunitionActions } from './ammunition.actions';

export const loadAmmunition = createEffect(
  (actions$ = inject(Actions), storage = inject(AmmunitionStorage)) =>
    actions$.pipe(
      ofType(AmmunitionActions.load),
      switchMap(() =>
        from(storage.getAll()).pipe(
          map((ammunition) => AmmunitionActions.loadSuccess({ ammunition })),
          catchError((error: unknown) => of(AmmunitionActions.loadFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const addAmmunition = createEffect(
  (actions$ = inject(Actions), storage = inject(AmmunitionStorage)) =>
    actions$.pipe(
      ofType(AmmunitionActions.addAmmunition),
      concatMap(({ ammunition }) =>
        from(storage.add(ammunition)).pipe(
          map((stored) => AmmunitionActions.addAmmunitionSuccess({ ammunition: stored })),
          catchError((error: unknown) => of(AmmunitionActions.addAmmunitionFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const updateAmmunition = createEffect(
  (actions$ = inject(Actions), storage = inject(AmmunitionStorage)) =>
    actions$.pipe(
      ofType(AmmunitionActions.updateAmmunition),
      concatMap(({ ammunition }) =>
        from(storage.update(ammunition)).pipe(
          map((stored) => AmmunitionActions.updateAmmunitionSuccess({ ammunition: stored })),
          catchError((error: unknown) => of(AmmunitionActions.updateAmmunitionFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const deleteAmmunition = createEffect(
  (actions$ = inject(Actions), storage = inject(AmmunitionStorage)) =>
    actions$.pipe(
      ofType(AmmunitionActions.deleteAmmunition),
      mergeMap(({ id }) =>
        from(storage.delete(id)).pipe(
          map(() => AmmunitionActions.deleteAmmunitionSuccess({ id })),
          catchError((error: unknown) => of(AmmunitionActions.deleteAmmunitionFailure({ id, error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);
