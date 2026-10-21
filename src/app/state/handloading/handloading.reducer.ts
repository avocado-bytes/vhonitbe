import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { LoadSeries } from '../../model/load-series';
import { HandloadingActions } from './handloading.actions';

export interface HandloadingState {
  /** The load development series */
  series: LoadSeries[];
  loading: boolean;
  loadError: string | null;
  /** The add form is open */
  formOpen: boolean;
  saving: boolean;
  saveError: string | null;
}

export const initialState: HandloadingState = {
  series: [],
  loading: false,
  loadError: null,
  formOpen: false,
  saving: false,
  saveError: null,
};

export const handloadingFeature = createFeature({
  name: 'handloading',
  reducer: createReducer(
    initialState,
    on(HandloadingActions.load, (state): HandloadingState => ({ ...state, loading: true, loadError: null })),
    on(HandloadingActions.loadSuccess, (state, { series }): HandloadingState => ({ ...state, series, loading: false })),
    on(HandloadingActions.loadFailure, (state, { error }): HandloadingState => ({ ...state, loading: false, loadError: error })),
    on(HandloadingActions.startAdd, (state): HandloadingState => ({ ...state, formOpen: true, saveError: null })),
    on(HandloadingActions.closeForm, (state): HandloadingState => ({ ...state, formOpen: false })),
    on(HandloadingActions.addSeries, (state): HandloadingState => ({ ...state, saving: true, saveError: null })),
    on(
      HandloadingActions.addSeriesSuccess,
      (state, { series }): HandloadingState => ({ ...state, series: [...state.series, series], saving: false, formOpen: false }),
    ),
    on(HandloadingActions.addSeriesFailure, (state, { error }): HandloadingState => ({ ...state, saving: false, saveError: error })),
  ),
  extraSelectors: ({ selectSeries }) => ({
    /** The series ordered by caliber */
    selectSorted: createSelector(selectSeries, (series) => [...series].sort((a, b) => a.caliber.localeCompare(b.caliber))),
  }),
});

export const { selectSorted, selectLoading, selectLoadError, selectFormOpen, selectSaving, selectSaveError } = handloadingFeature;
