import { createFeature, createReducer, on } from '@ngrx/store';
import { MapOptionsActions } from '../map-options/map-options.actions';
import { LocationActions } from './location.actions';
import { LocationState } from './location.model';

export const initialState: LocationState = {
  status: 'idle',
  position: null,
  error: null,
  manual: false,
};

export const locationFeature = createFeature({
  name: 'location',
  reducer: createReducer(
    initialState,
    // A position set by hand stays until tracking is turned on again
    on(LocationActions.locate, (state): LocationState => (state.manual ? state : { ...state, status: 'locating', error: null })),
    on(LocationActions.located, (state, { position }): LocationState =>
      state.manual ? state : { ...state, status: 'located', position },
    ),
    on(LocationActions.locateFailed, (state, { error }): LocationState =>
      state.manual ? state : { ...state, status: 'error', error },
    ),
    on(
      LocationActions.setManualPosition,
      (state, { position }): LocationState => ({ ...state, status: 'located', position, error: null, manual: true }),
    ),
    on(MapOptionsActions.setTracking, (state, { enabled }): LocationState => (enabled ? { ...state, manual: false } : state)),
  ),
});

export const { selectStatus, selectPosition, selectError, selectManual } = locationFeature;
