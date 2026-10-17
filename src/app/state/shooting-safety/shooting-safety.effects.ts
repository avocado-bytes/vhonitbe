import { inject } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, distinctUntilChanged, EMPTY, filter, from, map, of, switchMap } from 'rxjs';
import { BackstopAnalyzer } from '../../shooting-safety/backstop-analyzer';
import { distance } from '../../shooting-safety/geo';
import { selectPosition } from '../location/location.reducer';
import { Coordinates } from '../location/location.model';
import { ShootingSafetyActions } from './shooting-safety.actions';
import { selectShootingSafetyEnabled } from './shooting-safety.reducer';

/** Smaller moves are within the accuracy of the position and the elevation data */
const REANALYZE_DISTANCE = 15;

/** Analyzes the terrain around the user while enabled, again whenever the user moves noticeably */
export const analyze = createEffect(
  (store = inject(Store), analyzer = inject(BackstopAnalyzer)) =>
    store.select(selectShootingSafetyEnabled).pipe(
      distinctUntilChanged(),
      // Disabling cancels a running analysis
      switchMap((enabled) =>
        enabled
          ? store.select(selectPosition).pipe(
              filter((position): position is Coordinates => position !== null),
              distinctUntilChanged((previous, current) => distance(previous, current) < REANALYZE_DISTANCE),
              switchMap((position) =>
                from(analyzer.analyze(position)).pipe(
                  map((overlay) => ShootingSafetyActions.analyzeSuccess({ overlay })),
                  catchError((error: unknown) => of(ShootingSafetyActions.analyzeFailure({ error: String(error) }))),
                ),
              ),
            )
          : EMPTY,
      ),
    ),
  { functional: true },
);
