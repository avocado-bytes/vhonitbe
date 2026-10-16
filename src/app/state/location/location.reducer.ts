import { createFeature, createReducer, on } from '@ngrx/store';
import { LocationActions } from './location.actions';
import { LocationState } from './location.model';

export const initialState: LocationState = {
  status: 'idle',
  position: null,
  error: null,
};

export const locationFeature = createFeature({
  name: 'location',
  reducer: createReducer(
    initialState,
    on(LocationActions.locate, (state): LocationState => ({ ...state, status: 'locating', error: null })),
    on(LocationActions.located, (state, { position }): LocationState => ({ ...state, status: 'located', position })),
    on(LocationActions.locateFailed, (state, { error }): LocationState => ({ ...state, status: 'error', error })),
  ),
});

export const { selectStatus, selectPosition, selectError } = locationFeature;
