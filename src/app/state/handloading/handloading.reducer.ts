import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { LoadSeries, TestLoad } from '../../model/load-series';
import { HandloadingActions } from './handloading.actions';

/** What the dialog is open for */
export type HandloadingForm = 'series' | 'load';

export interface HandloadingState {
  /** The load development series */
  series: LoadSeries[];
  loading: boolean;
  loadError: string | null;
  /** The dialog is open for a series or for a test load; null when closed */
  form: HandloadingForm | null;
  /** The series whose details are open in the form; null while adding a new one */
  editingSeries: LoadSeries | null;
  /** The series a test load in the form belongs to */
  loadSeriesId: string | null;
  /** The test load open in the form; null while adding a new one */
  editingLoad: TestLoad | null;
  saving: boolean;
  saveError: string | null;
  /** Ids of series currently being deleted */
  deleting: string[];
  deleteError: string | null;
  /** Ids of test loads currently being added to the ammunition list */
  promoting: string[];
  promoteError: string | null;
}

export const initialState: HandloadingState = {
  series: [],
  loading: false,
  loadError: null,
  form: null,
  editingSeries: null,
  loadSeriesId: null,
  editingLoad: null,
  saving: false,
  saveError: null,
  deleting: [],
  deleteError: null,
  promoting: [],
  promoteError: null,
};

const closedForm = { form: null, editingSeries: null, loadSeriesId: null, editingLoad: null } as const;

function replace(series: LoadSeries[], updated: LoadSeries): LoadSeries[] {
  return series.map((existing) => (existing.id === updated.id ? updated : existing));
}

export const handloadingFeature = createFeature({
  name: 'handloading',
  reducer: createReducer(
    initialState,
    on(HandloadingActions.load, (state): HandloadingState => ({ ...state, loading: true, loadError: null })),
    on(HandloadingActions.loadSuccess, (state, { series }): HandloadingState => ({ ...state, series, loading: false })),
    on(HandloadingActions.loadFailure, (state, { error }): HandloadingState => ({ ...state, loading: false, loadError: error })),
    on(HandloadingActions.startAdd, (state): HandloadingState => ({ ...state, ...closedForm, form: 'series', saveError: null })),
    on(
      HandloadingActions.startEdit,
      (state, { series }): HandloadingState => ({ ...state, ...closedForm, form: 'series', editingSeries: series, saveError: null }),
    ),
    on(
      HandloadingActions.startAddLoad,
      (state, { seriesId }): HandloadingState => ({ ...state, ...closedForm, form: 'load', loadSeriesId: seriesId, saveError: null }),
    ),
    on(
      HandloadingActions.startEditLoad,
      (state, { seriesId, load }): HandloadingState => ({
        ...state,
        ...closedForm,
        form: 'load',
        loadSeriesId: seriesId,
        editingLoad: load,
        saveError: null,
      }),
    ),
    on(HandloadingActions.closeForm, (state): HandloadingState => ({ ...state, ...closedForm })),
    on(
      HandloadingActions.addSeries,
      HandloadingActions.updateSeries,
      (state): HandloadingState => ({ ...state, saving: true, saveError: null }),
    ),
    on(
      HandloadingActions.addSeriesSuccess,
      (state, { series }): HandloadingState => ({ ...state, ...closedForm, series: [...state.series, series], saving: false }),
    ),
    on(
      HandloadingActions.updateSeriesSuccess,
      (state, { series }): HandloadingState => ({ ...state, ...closedForm, series: replace(state.series, series), saving: false }),
    ),
    on(
      HandloadingActions.addSeriesFailure,
      HandloadingActions.updateSeriesFailure,
      (state, { error }): HandloadingState => ({ ...state, saving: false, saveError: error }),
    ),
    on(
      HandloadingActions.deleteSeries,
      (state, { id }): HandloadingState => ({ ...state, deleting: [...state.deleting, id], deleteError: null }),
    ),
    on(
      HandloadingActions.deleteSeriesSuccess,
      (state, { id }): HandloadingState => ({
        ...state,
        series: state.series.filter((series) => series.id !== id),
        deleting: state.deleting.filter((deleting) => deleting !== id),
      }),
    ),
    on(
      HandloadingActions.deleteSeriesFailure,
      (state, { id, error }): HandloadingState => ({
        ...state,
        deleting: state.deleting.filter((deleting) => deleting !== id),
        deleteError: error,
      }),
    ),
    on(
      HandloadingActions.promoteLoad,
      (state, { loadId }): HandloadingState => ({ ...state, promoting: [...state.promoting, loadId], promoteError: null }),
    ),
    on(
      HandloadingActions.promoteLoadSuccess,
      (state, { series }): HandloadingState => ({
        ...state,
        series: replace(state.series, series),
        promoting: state.promoting.filter((id) => !(series.loads ?? []).some((load) => load.id === id)),
      }),
    ),
    on(
      HandloadingActions.promoteLoadFailure,
      (state, { loadId, error }): HandloadingState => ({
        ...state,
        promoting: state.promoting.filter((id) => id !== loadId),
        promoteError: error,
      }),
    ),
  ),
  extraSelectors: ({ selectSeries, selectLoadSeriesId }) => ({
    /** The series ordered by caliber, then by name */
    selectSorted: createSelector(selectSeries, (series) =>
      [...series].sort((a, b) => a.caliber.localeCompare(b.caliber) || (a.name ?? '').localeCompare(b.name ?? '')),
    ),
    /** The series a test load in the form belongs to */
    selectLoadSeries: createSelector(selectSeries, selectLoadSeriesId, (series, id) => series.find((s) => s.id === id) ?? null),
  }),
});

export const {
  selectSeries,
  selectSorted,
  selectLoading,
  selectLoadError,
  selectForm,
  selectEditingSeries,
  selectEditingLoad,
  selectLoadSeries,
  selectSaving,
  selectSaveError,
  selectDeleting,
  selectDeleteError,
  selectPromoting,
  selectPromoteError,
} = handloadingFeature;
