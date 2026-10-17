import { createFeature, createReducer, on } from '@ngrx/store';
import { ShootingSafetyActions } from './shooting-safety.actions';
import { ShootingSafetyState } from './shooting-safety.model';

export const initialState: ShootingSafetyState = {
  enabled: false,
  status: 'idle',
  overlay: null,
  error: null,
};

export const shootingSafetyFeature = createFeature({
  name: 'shootingSafety',
  reducer: createReducer(
    initialState,
    on(ShootingSafetyActions.setEnabled, (state, { enabled }): ShootingSafetyState =>
      enabled ? { ...state, enabled, status: 'loading', error: null } : initialState,
    ),
    // The previous overlay stays visible until the new one is ready
    on(ShootingSafetyActions.analyze, (state): ShootingSafetyState => ({ ...state, status: 'loading', error: null })),
    on(ShootingSafetyActions.analyzeSuccess, (state, { overlay }): ShootingSafetyState => ({ ...state, status: 'ready', overlay })),
    on(
      ShootingSafetyActions.analyzeFailure,
      (state, { error }): ShootingSafetyState => ({ ...state, status: 'error', overlay: null, error }),
    ),
  ),
});

export const {
  selectEnabled: selectShootingSafetyEnabled,
  selectStatus: selectShootingSafetyStatus,
  selectOverlay: selectShootingSafetyOverlay,
} = shootingSafetyFeature;
