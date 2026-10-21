import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, from, map, mergeMap, of, switchMap } from 'rxjs';
import { promotedAmmunition } from '../../model/load-series';
import { AmmunitionStorage } from '../../storage/ammunition-storage';
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

export const updateSeries = createEffect(
  (actions$ = inject(Actions), storage = inject(LoadSeriesStorage)) =>
    actions$.pipe(
      ofType(HandloadingActions.updateSeries),
      concatMap(({ series }) =>
        from(storage.update(series)).pipe(
          map((stored) => HandloadingActions.updateSeriesSuccess({ series: stored })),
          catchError((error: unknown) => of(HandloadingActions.updateSeriesFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const deleteSeries = createEffect(
  (actions$ = inject(Actions), storage = inject(LoadSeriesStorage)) =>
    actions$.pipe(
      ofType(HandloadingActions.deleteSeries),
      mergeMap(({ id }) =>
        from(storage.delete(id)).pipe(
          map(() => HandloadingActions.deleteSeriesSuccess({ id })),
          catchError((error: unknown) => of(HandloadingActions.deleteSeriesFailure({ id, error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

/**
 * Adds a copy of the test load to the ammunition list, then marks the load as added. The ammunition is stored
 * first, so a load is never marked without its ammunition existing.
 */
export const promoteLoad = createEffect(
  (actions$ = inject(Actions), seriesStorage = inject(LoadSeriesStorage), ammunitionStorage = inject(AmmunitionStorage)) =>
    actions$.pipe(
      ofType(HandloadingActions.promoteLoad),
      concatMap(({ series, loadId }) => {
        const promote = async () => {
          const load = series.loads?.find(({ id }) => id === loadId);
          if (!load) {
            throw new Error(`Test load ${loadId} does not exist`);
          }
          const ammunition = await ammunitionStorage.add(promotedAmmunition(series, load));
          const promotedAt = new Date().toISOString();
          const updated = await seriesStorage.update({
            ...series,
            loads: series.loads?.map((existing) => (existing.id === loadId ? { ...existing, promotedAt } : existing)),
          });
          return HandloadingActions.promoteLoadSuccess({ series: updated, ammunition });
        };
        return from(promote()).pipe(
          catchError((error: unknown) => of(HandloadingActions.promoteLoadFailure({ loadId, error: String(error) }))),
        );
      }),
    ),
  { functional: true },
);
