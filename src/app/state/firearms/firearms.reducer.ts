import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { Firearm } from '../../model/firearm';
import { AmmunitionActions } from '../ammunition/ammunition.actions';
import { FirearmsActions } from './firearms.actions';

export interface FirearmsState {
  firearms: Firearm[];
  loading: boolean;
  loadError: string | null;
  /** The add/edit dialog is open, for a firearm or for ammunition */
  formOpen: boolean;
  /** The firearm open in the form; null while adding a new one */
  editing: Firearm | null;
  saving: boolean;
  saveError: string | null;
  /** Ids of firearms currently being deleted */
  deleting: string[];
  deleteError: string | null;
}

export const initialState: FirearmsState = {
  firearms: [],
  loading: false,
  loadError: null,
  formOpen: false,
  editing: null,
  saving: false,
  saveError: null,
  deleting: [],
  deleteError: null,
};

export const firearmsFeature = createFeature({
  name: 'firearms',
  reducer: createReducer(
    initialState,
    on(FirearmsActions.load, (state): FirearmsState => ({ ...state, loading: true, loadError: null })),
    on(FirearmsActions.loadSuccess, (state, { firearms }): FirearmsState => ({ ...state, firearms, loading: false })),
    on(FirearmsActions.loadFailure, (state, { error }): FirearmsState => ({ ...state, loading: false, loadError: error })),
    on(FirearmsActions.startAdd, (state): FirearmsState => ({ ...state, formOpen: true, editing: null, saveError: null })),
    on(
      FirearmsActions.startEdit,
      (state, { firearm }): FirearmsState => ({ ...state, formOpen: true, editing: firearm, saveError: null }),
    ),
    on(FirearmsActions.closeForm, (state): FirearmsState => ({ ...state, formOpen: false, editing: null })),
    on(FirearmsActions.addFirearm, FirearmsActions.updateFirearm, (state): FirearmsState => ({ ...state, saving: true, saveError: null })),
    on(
      FirearmsActions.addFirearmSuccess,
      (state, { firearm }): FirearmsState => ({ ...state, firearms: [...state.firearms, firearm], saving: false, formOpen: false }),
    ),
    on(
      FirearmsActions.updateFirearmSuccess,
      (state, { firearm }): FirearmsState => ({
        ...state,
        firearms: state.firearms.map((existing) => (existing.id === firearm.id ? firearm : existing)),
        saving: false,
        formOpen: false,
        editing: null,
      }),
    ),
    on(
      FirearmsActions.addFirearmFailure,
      FirearmsActions.updateFirearmFailure,
      (state, { error }): FirearmsState => ({ ...state, saving: false, saveError: error }),
    ),
    // The dialog also adds and edits ammunition, and closes once it is saved
    on(AmmunitionActions.startEdit, (state): FirearmsState => ({ ...state, formOpen: true, editing: null })),
    on(
      AmmunitionActions.addAmmunitionSuccess,
      AmmunitionActions.updateAmmunitionSuccess,
      (state): FirearmsState => ({ ...state, formOpen: false }),
    ),
    on(
      FirearmsActions.deleteFirearm,
      (state, { id }): FirearmsState => ({ ...state, deleting: [...state.deleting, id], deleteError: null }),
    ),
    on(
      FirearmsActions.deleteFirearmSuccess,
      (state, { id }): FirearmsState => ({
        ...state,
        firearms: state.firearms.filter((firearm) => firearm.id !== id),
        deleting: state.deleting.filter((deleting) => deleting !== id),
      }),
    ),
    on(
      FirearmsActions.deleteFirearmFailure,
      (state, { id, error }): FirearmsState => ({
        ...state,
        deleting: state.deleting.filter((deleting) => deleting !== id),
        deleteError: error,
      }),
    ),
  ),
  extraSelectors: ({ selectFirearms }) => ({
    /** The firearms ordered by name */
    selectSorted: createSelector(selectFirearms, (firearms) => [...firearms].sort((a, b) => a.name.localeCompare(b.name))),
  }),
});

export const {
  selectSorted,
  selectLoading,
  selectLoadError,
  selectFormOpen,
  selectEditing,
  selectSaving,
  selectSaveError,
  selectDeleting,
  selectDeleteError,
} = firearmsFeature;
