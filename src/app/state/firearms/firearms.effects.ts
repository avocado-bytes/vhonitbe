import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, from, map, mergeMap, of, switchMap } from 'rxjs';
import { FirearmStorage } from '../../storage/firearm-storage';
import { FirearmsActions } from './firearms.actions';

export const loadFirearms = createEffect(
  (actions$ = inject(Actions), storage = inject(FirearmStorage)) =>
    actions$.pipe(
      ofType(FirearmsActions.load),
      switchMap(() =>
        from(storage.getAll()).pipe(
          map((firearms) => FirearmsActions.loadSuccess({ firearms })),
          catchError((error: unknown) => of(FirearmsActions.loadFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const addFirearm = createEffect(
  (actions$ = inject(Actions), storage = inject(FirearmStorage)) =>
    actions$.pipe(
      ofType(FirearmsActions.addFirearm),
      concatMap(({ firearm }) =>
        from(storage.add(firearm)).pipe(
          map((stored) => FirearmsActions.addFirearmSuccess({ firearm: stored })),
          catchError((error: unknown) => of(FirearmsActions.addFirearmFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const updateFirearm = createEffect(
  (actions$ = inject(Actions), storage = inject(FirearmStorage)) =>
    actions$.pipe(
      ofType(FirearmsActions.updateFirearm),
      concatMap(({ firearm }) =>
        from(storage.update(firearm)).pipe(
          map((stored) => FirearmsActions.updateFirearmSuccess({ firearm: stored })),
          catchError((error: unknown) => of(FirearmsActions.updateFirearmFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const deleteFirearm = createEffect(
  (actions$ = inject(Actions), storage = inject(FirearmStorage)) =>
    actions$.pipe(
      ofType(FirearmsActions.deleteFirearm),
      mergeMap(({ id }) =>
        from(storage.delete(id)).pipe(
          map(() => FirearmsActions.deleteFirearmSuccess({ id })),
          catchError((error: unknown) => of(FirearmsActions.deleteFirearmFailure({ id, error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);
