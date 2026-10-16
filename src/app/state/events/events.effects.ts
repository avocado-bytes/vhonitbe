import { inject } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, concatMap, exhaustMap, from, map, mergeMap, of, switchMap, withLatestFrom } from 'rxjs';
import { EventStorage } from '../../storage/event-storage';
import { EventsActions } from './events.actions';
import { LATEST_EVENTS_COUNT, selectPageCount, selectPageIndex, selectPageSize } from './events.reducer';

/** Asks the browser to keep the database when it runs low on storage */
export const requestPersistentStorage = createEffect(
  (actions$ = inject(Actions), storage = inject(EventStorage)) =>
    actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      exhaustMap(() => from(storage.requestPersistence()).pipe(catchError(() => of(false)))),
    ),
  { functional: true, dispatch: false },
);

/** Loads the newest events when the application starts */
export const loadOnStartup = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() => EventsActions.loadPage({ pageIndex: 0 })),
    ),
  { functional: true },
);

/** Shows the newly added event, which is the newest one, on the first page */
export const reloadAfterAdd = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(EventsActions.addEventSuccess),
      map(() => EventsActions.loadPage({ pageIndex: 0 })),
    ),
  { functional: true },
);

export const loadPage = createEffect(
  (actions$ = inject(Actions), store = inject(Store), storage = inject(EventStorage)) =>
    actions$.pipe(
      ofType(EventsActions.loadPage),
      withLatestFrom(store.select(selectPageSize)),
      // A newer page request makes an older, still running one obsolete
      switchMap(([{ pageIndex }, pageSize]) =>
        from(storage.getPage(pageIndex * pageSize, pageSize)).pipe(
          map(({ events, total }) => EventsActions.loadPageSuccess({ pageIndex, events, total })),
          catchError((error: unknown) => of(EventsActions.loadPageFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const loadLatest = createEffect(
  (actions$ = inject(Actions), storage = inject(EventStorage)) =>
    actions$.pipe(
      ofType(EventsActions.loadLatest),
      switchMap(() =>
        from(storage.getPage(0, LATEST_EVENTS_COUNT)).pipe(
          map(({ events }) => EventsActions.loadLatestSuccess({ events })),
          catchError((error: unknown) => of(EventsActions.loadLatestFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

/** Keeps the latest events current after any change */
export const reloadLatestAfterChange = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(EventsActions.addEventSuccess, EventsActions.updateEventSuccess, EventsActions.deleteEventSuccess),
      map(() => EventsActions.loadLatest()),
    ),
  { functional: true },
);

export const addEvent = createEffect(
  (actions$ = inject(Actions), storage = inject(EventStorage)) =>
    actions$.pipe(
      ofType(EventsActions.addEvent),
      concatMap(({ event }) =>
        from(storage.add(event)).pipe(
          map((stored) => EventsActions.addEventSuccess({ event: stored })),
          catchError((error: unknown) => of(EventsActions.addEventFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const updateEvent = createEffect(
  (actions$ = inject(Actions), storage = inject(EventStorage)) =>
    actions$.pipe(
      ofType(EventsActions.updateEvent),
      concatMap(({ event }) =>
        from(storage.update(event)).pipe(
          map((stored) => EventsActions.updateEventSuccess({ event: stored })),
          catchError((error: unknown) => of(EventsActions.updateEventFailure({ error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

/** Reloads the current page, since a changed date can move the event to another position */
export const reloadAfterUpdate = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) =>
    actions$.pipe(
      ofType(EventsActions.updateEventSuccess),
      withLatestFrom(store.select(selectPageIndex)),
      map(([, pageIndex]) => EventsActions.loadPage({ pageIndex })),
    ),
  { functional: true },
);

export const deleteEvent = createEffect(
  (actions$ = inject(Actions), storage = inject(EventStorage)) =>
    actions$.pipe(
      ofType(EventsActions.deleteEvent),
      mergeMap(({ id }) =>
        from(storage.delete(id)).pipe(
          map(() => EventsActions.deleteEventSuccess({ id })),
          catchError((error: unknown) => of(EventsActions.deleteEventFailure({ id, error: String(error) }))),
        ),
      ),
    ),
  { functional: true },
);

/** Refills the current page, stepping back a page if the deleted event was the last one on it */
export const reloadAfterDelete = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) =>
    actions$.pipe(
      ofType(EventsActions.deleteEventSuccess),
      withLatestFrom(store.select(selectPageIndex), store.select(selectPageCount)),
      map(([, pageIndex, pageCount]) => EventsActions.loadPage({ pageIndex: Math.min(pageIndex, pageCount - 1) })),
    ),
  { functional: true },
);
