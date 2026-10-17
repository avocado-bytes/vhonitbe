import { createFeature, createReducer, on } from '@ngrx/store';
import { MapOptionsActions } from './map-options.actions';

export interface MapOptionsState {
  /** Circles at fixed distances around the user */
  distanceRings: boolean;
  /** Refresh the user's position regularly while the map is open */
  tracking: boolean;
  /** Keep the map centered on the user's position */
  followMe: boolean;
}

export const initialState: MapOptionsState = {
  distanceRings: false,
  tracking: true,
  followMe: true,
};

export const mapOptionsFeature = createFeature({
  name: 'mapOptions',
  reducer: createReducer(
    initialState,
    on(MapOptionsActions.setDistanceRings, (state, { enabled }): MapOptionsState => ({ ...state, distanceRings: enabled })),
    on(MapOptionsActions.setTracking, (state, { enabled }): MapOptionsState => ({ ...state, tracking: enabled })),
    on(MapOptionsActions.setFollowMe, (state, { enabled }): MapOptionsState => ({ ...state, followMe: enabled })),
  ),
});

export const { selectDistanceRings, selectTracking, selectFollowMe } = mapOptionsFeature;
