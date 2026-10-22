import { createFeature, createReducer, on } from '@ngrx/store';
import { MapOptionsActions } from './map-options.actions';

export interface MapOptionsState {
  /** Circles at fixed distances around the user */
  distanceRings: boolean;
  /** Refresh the user's position regularly while the map is open */
  tracking: boolean;
  /** Keep the map centered on the user's position */
  followMe: boolean;
  /** A cone showing where the wind carries the user's scent */
  windCone: boolean;
  /** The boundary of the user's hunting ground, on every map */
  huntingGround: boolean;
  /** The options and legend panel is shown on small screens, where it is collapsed behind a button */
  panelOpen: boolean;
}

export const initialState: MapOptionsState = {
  distanceRings: false,
  tracking: true,
  followMe: true,
  windCone: false,
  huntingGround: true,
  panelOpen: false,
};

export const mapOptionsFeature = createFeature({
  name: 'mapOptions',
  reducer: createReducer(
    initialState,
    on(MapOptionsActions.setDistanceRings, (state, { enabled }): MapOptionsState => ({ ...state, distanceRings: enabled })),
    on(MapOptionsActions.setTracking, (state, { enabled }): MapOptionsState => ({ ...state, tracking: enabled })),
    on(MapOptionsActions.setFollowMe, (state, { enabled }): MapOptionsState => ({ ...state, followMe: enabled })),
    on(MapOptionsActions.setWindCone, (state, { enabled }): MapOptionsState => ({ ...state, windCone: enabled })),
    on(MapOptionsActions.setHuntingGround, (state, { enabled }): MapOptionsState => ({ ...state, huntingGround: enabled })),
    on(MapOptionsActions.setPanelOpen, (state, { open }): MapOptionsState => ({ ...state, panelOpen: open })),
  ),
});

export const { selectDistanceRings, selectTracking, selectFollowMe, selectWindCone, selectHuntingGround, selectPanelOpen } = mapOptionsFeature;
