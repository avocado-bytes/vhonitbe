import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { HuntingEvent } from '../../model/event';
import { EventsActions } from './events.actions';

export const EVENTS_PAGE_SIZE = 10;
/** How many of the newest events are shown on the map */
export const LATEST_EVENTS_COUNT = 10;

export interface EventsState {
  /** The currently loaded page of events, newest first */
  events: HuntingEvent[];
  /** Zero-based index of the loaded page */
  pageIndex: number;
  pageSize: number;
  /** Number of all stored events */
  total: number;
  loading: boolean;
  loadError: string | null;
  /** The newest events regardless of the loaded page, for the map */
  latest: HuntingEvent[];
  /** The event open in the edit dialog */
  editing: HuntingEvent | null;
  /** Adding or updating an event */
  saving: boolean;
  saveError: string | null;
  /** Ids of events currently being deleted */
  deleting: string[];
  deleteError: string | null;
}

export const initialState: EventsState = {
  events: [],
  pageIndex: 0,
  pageSize: EVENTS_PAGE_SIZE,
  total: 0,
  loading: false,
  loadError: null,
  latest: [],
  editing: null,
  saving: false,
  saveError: null,
  deleting: [],
  deleteError: null,
};

export const eventsFeature = createFeature({
  name: 'events',
  reducer: createReducer(
    initialState,
    on(EventsActions.loadPage, (state): EventsState => ({ ...state, loading: true, loadError: null })),
    on(
      EventsActions.loadPageSuccess,
      (state, { pageIndex, events, total }): EventsState => ({ ...state, pageIndex, events, total, loading: false }),
    ),
    on(EventsActions.loadPageFailure, (state, { error }): EventsState => ({ ...state, loading: false, loadError: error })),
    on(EventsActions.loadLatestSuccess, (state, { events }): EventsState => ({ ...state, latest: events })),
    on(EventsActions.addEvent, (state): EventsState => ({ ...state, saving: true, saveError: null })),
    on(EventsActions.addEventSuccess, (state): EventsState => ({ ...state, saving: false })),
    on(EventsActions.addEventFailure, (state, { error }): EventsState => ({ ...state, saving: false, saveError: error })),
    on(EventsActions.startEdit, (state, { event }): EventsState => ({ ...state, editing: event, saveError: null })),
    on(EventsActions.cancelEdit, (state): EventsState => ({ ...state, editing: null })),
    on(EventsActions.updateEvent, (state): EventsState => ({ ...state, saving: true, saveError: null })),
    on(
      EventsActions.updateEventSuccess,
      (state, { event }): EventsState => ({
        ...state,
        events: state.events.map((existing) => (existing.id === event.id ? event : existing)),
        editing: null,
        saving: false,
      }),
    ),
    on(EventsActions.updateEventFailure, (state, { error }): EventsState => ({ ...state, saving: false, saveError: error })),
    on(
      EventsActions.deleteEvent,
      (state, { id }): EventsState => ({ ...state, deleting: [...state.deleting, id], deleteError: null }),
    ),
    on(
      EventsActions.deleteEventSuccess,
      (state, { id }): EventsState => ({
        ...state,
        // Remove it right away; the page is reloaded afterwards to fill the gap
        events: state.events.filter((event) => event.id !== id),
        total: Math.max(0, state.total - 1),
        deleting: state.deleting.filter((deleting) => deleting !== id),
      }),
    ),
    on(
      EventsActions.deleteEventFailure,
      (state, { id, error }): EventsState => ({
        ...state,
        deleting: state.deleting.filter((deleting) => deleting !== id),
        deleteError: error,
      }),
    ),
  ),
  extraSelectors: ({ selectTotal, selectPageSize }) => ({
    selectPageCount: createSelector(selectTotal, selectPageSize, (total, pageSize) =>
      Math.max(1, Math.ceil(total / pageSize)),
    ),
  }),
});

export const {
  selectEvents,
  selectPageIndex,
  selectPageSize,
  selectPageCount,
  selectTotal,
  selectLoading,
  selectLoadError,
  selectLatest,
  selectEditing,
  selectSaving,
  selectSaveError,
  selectDeleting,
  selectDeleteError,
} = eventsFeature;
