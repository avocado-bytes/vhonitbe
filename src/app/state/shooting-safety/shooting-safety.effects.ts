import { inject } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, distinctUntilChanged, EMPTY, filter, map, of, startWith, switchMap } from 'rxjs';
import { BackstopAnalyzer } from '../../shooting-safety/backstop-analyzer';
import { distance } from '../../shooting-safety/geo';
import { selectPosition } from '../location/location.reducer';
import { Coordinates } from '../location/location.model';
import { ShootingSafetyActions } from './shooting-safety.actions';
import { selectShootingSafetyEnabled } from './shooting-safety.reducer';

/** Smaller moves are within the accuracy of the position and the elevation data, in meters */
const REANALYZE_DISTANCE = 20;

/**
 * Whether `current` is far enough from the analyzed position to analyze again. A fix within its own
 * accuracy radius of it may be the same spot, as reported positions jump around even when standing still.
 * A more accurate fix further away still restarts, correcting an analysis based on a rough first fix.
 */
function movedNoticeably(analyzed: Coordinates, current: Coordinates): boolean {
  return distance(analyzed, current) > Math.max(REANALYZE_DISTANCE, current.accuracy);
}

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
              // Compares with the last analyzed position, so slow drift still adds up
              distinctUntilChanged((analyzed, current) => !movedNoticeably(analyzed, current)),
              switchMap((position) =>
                analyzer.analyze(position).pipe(
                  map((overlay) => ShootingSafetyActions.analyzeSuccess({ overlay })),
                  catchError((error: unknown) => of(ShootingSafetyActions.analyzeFailure({ error: String(error) }))),
                  startWith(ShootingSafetyActions.analyze()),
                ),
              ),
            )
          : EMPTY,
      ),
    ),
  { functional: true },
);
