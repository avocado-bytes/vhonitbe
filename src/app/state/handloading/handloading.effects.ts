import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, from, map, of, switchMap } from 'rxjs';
import { LoadSeriesStorage } from '../../storage/load-series-storage';
import { HandloadingActions } from './handloading.actions';

export const loadSeries = createEffect(
  (actions$ = inject(Actions), storage = inject(LoadSeriesStorage)) =>
    actions$.pipe(
      ofType(HandloadingActions.load),
      switchMap(() =>
        from(storage.getAll()).pipe(
          map((series) => HandloadingActions.loadSuccess({ series })),
          catchError((error: unknown) => of(HandloadingActions.loadFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const addSeries = createEffect(
  (actions$ = inject(Actions), storage = inject(LoadSeriesStorage)) =>
    actions$.pipe(
      ofType(HandloadingActions.addSeries),
      concatMap(({ series }) =>
        from(storage.add(series)).pipe(
          map((stored) => HandloadingActions.addSeriesSuccess({ series: stored })),
          catchError((error: unknown) => of(HandloadingActions.addSeriesFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);
