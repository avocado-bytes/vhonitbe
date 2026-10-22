import { createFeature, createReducer, on } from '@ngrx/store';
import { HuntingGround } from '../../model/hunting-ground';
import { HuntingGroundActions } from './hunting-ground.actions';
import { HuntingGroundError } from './hunting-ground.model';

export interface HuntingGroundState {
  ground: HuntingGround | null;
  /** The hunting grounds found by the last search, to choose from; null when no search is open */
  candidates: HuntingGround[] | null;
  /** A search or a refresh is waiting for the position or the service */
  busy: boolean;
  error: HuntingGroundError | null;
}

export const initialState: HuntingGroundState = {
  ground: null,
  candidates: null,
  busy: false,
  error: null,
};

export const huntingGroundFeature = createFeature({
  name: 'huntingGround',
  reducer: createReducer(
    initialState,
    on(HuntingGroundActions.loadSuccess, (state, { ground }): HuntingGroundState => ({ ...state, ground })),
    on(
      HuntingGroundActions.search,
      HuntingGroundActions.refresh,
      (state): HuntingGroundState => ({ ...state, candidates: null, busy: true, error: null }),
    ),
    on(HuntingGroundActions.searchSuccess, (state, { candidates }): HuntingGroundState => ({ ...state, candidates, busy: false })),
    on(
      HuntingGroundActions.searchFailure,
      HuntingGroundActions.saveFailure,
      (state, { error }): HuntingGroundState => ({ ...state, busy: false, error }),
    ),
    on(HuntingGroundActions.cancelSearch, (state): HuntingGroundState => ({ ...state, candidates: null, error: null })),
    on(HuntingGroundActions.choose, (state): HuntingGroundState => ({ ...state, busy: true, error: null })),
    on(
      HuntingGroundActions.saveSuccess,
      (state, { ground }): HuntingGroundState => ({ ...state, ground, candidates: null, busy: false }),
    ),
    on(HuntingGroundActions.removeSuccess, (state): HuntingGroundState => ({ ...state, ground: null, error: null })),
  ),
});

export const { selectGround, selectCandidates, selectBusy, selectError } = huntingGroundFeature;
