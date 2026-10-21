import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { Ammunition } from '../../model/ammunition';
import { FirearmsActions } from '../firearms/firearms.actions';
import { AmmunitionActions } from './ammunition.actions';

export interface AmmunitionState {
  ammunition: Ammunition[];
  loading: boolean;
  loadError: string | null;
  /** The ammunition open in the dialog; null while adding or while a firearm is open */
  editing: Ammunition | null;
  saving: boolean;
  saveError: string | null;
  /** Ids of ammunition currently being deleted */
  deleting: string[];
  deleteError: string | null;
}

export const initialState: AmmunitionState = {
  ammunition: [],
  loading: false,
  loadError: null,
  editing: null,
  saving: false,
  saveError: null,
  deleting: [],
  deleteError: null,
};

export const ammunitionFeature = createFeature({
  name: 'ammunition',
  reducer: createReducer(
    initialState,
    on(AmmunitionActions.load, (state): AmmunitionState => ({ ...state, loading: true, loadError: null })),
    on(AmmunitionActions.loadSuccess, (state, { ammunition }): AmmunitionState => ({ ...state, ammunition, loading: false })),
    on(AmmunitionActions.loadFailure, (state, { error }): AmmunitionState => ({ ...state, loading: false, loadError: error })),
    // The dialog is shared with the firearms; opening it again starts without an old error
    on(
      FirearmsActions.startAdd,
      FirearmsActions.startEdit,
      (state): AmmunitionState => ({ ...state, editing: null, saveError: null }),
    ),
    on(AmmunitionActions.startEdit, (state, { ammunition }): AmmunitionState => ({ ...state, editing: ammunition, saveError: null })),
    on(FirearmsActions.closeForm, (state): AmmunitionState => ({ ...state, editing: null })),
    on(
      AmmunitionActions.addAmmunition,
      AmmunitionActions.updateAmmunition,
      (state): AmmunitionState => ({ ...state, saving: true, saveError: null }),
    ),
    on(
      AmmunitionActions.addAmmunitionSuccess,
      (state, { ammunition }): AmmunitionState => ({ ...state, ammunition: [...state.ammunition, ammunition], saving: false }),
    ),
    on(
      AmmunitionActions.updateAmmunitionSuccess,
      (state, { ammunition }): AmmunitionState => ({
        ...state,
        ammunition: state.ammunition.map((existing) => (existing.id === ammunition.id ? ammunition : existing)),
        editing: null,
        saving: false,
      }),
    ),
    on(
      AmmunitionActions.addAmmunitionFailure,
      AmmunitionActions.updateAmmunitionFailure,
      (state, { error }): AmmunitionState => ({ ...state, saving: false, saveError: error }),
    ),
    on(
      AmmunitionActions.deleteAmmunition,
      (state, { id }): AmmunitionState => ({ ...state, deleting: [...state.deleting, id], deleteError: null }),
    ),
    on(
      AmmunitionActions.deleteAmmunitionSuccess,
      (state, { id }): AmmunitionState => ({
        ...state,
        ammunition: state.ammunition.filter((ammunition) => ammunition.id !== id),
        deleting: state.deleting.filter((deleting) => deleting !== id),
      }),
    ),
    on(
      AmmunitionActions.deleteAmmunitionFailure,
      (state, { id, error }): AmmunitionState => ({
        ...state,
        deleting: state.deleting.filter((deleting) => deleting !== id),
        deleteError: error,
      }),
    ),
  ),
  extraSelectors: ({ selectAmmunition }) => ({
    /** The ammunition ordered by caliber, then by bullet weight */
    selectSorted: createSelector(selectAmmunition, (ammunition) =>
      [...ammunition].sort((a, b) => a.caliber.localeCompare(b.caliber) || a.bulletWeight - b.bulletWeight),
    ),
  }),
});

export const {
  selectSorted,
  selectLoading,
  selectLoadError,
  selectEditing,
  selectSaving,
  selectSaveError,
  selectDeleting,
  selectDeleteError,
} = ammunitionFeature;
