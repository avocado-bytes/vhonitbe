import { createFeature, createReducer, on } from '@ngrx/store';
import { MapOptionsActions } from './map-options.actions';

export interface MapOptionsState {
  /** Circles at fixed distances around the user */
  distanceRings: boolean;
}

export const initialState: MapOptionsState = {
  distanceRings: false,
};

export const mapOptionsFeature = createFeature({
  name: 'mapOptions',
  reducer: createReducer(
    initialState,
    on(MapOptionsActions.setDistanceRings, (state, { enabled }): MapOptionsState => ({ ...state, distanceRings: enabled })),
  ),
});

export const { selectDistanceRings } = mapOptionsFeature;
