import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { FEEDING_PLACE_TYPES, FeedingPlace, FeedingPlaceType } from '../../model/feeding-place';
import { FeedingActions } from './feeding.actions';

export const FEEDING_PAGE_SIZE = 10;

export interface FeedingState {
  /** All feeders and salt licks; there are few enough to keep them all for the map */
  places: FeedingPlace[];
  loading: boolean;
  loadError: string | null;
  /** Only places of this type in the list; null for all */
  placeType: FeedingPlaceType | null;
  /** Zero-based index of the shown page of the list */
  pageIndex: number;
  /** The add/edit form is open */
  formOpen: boolean;
  /** The place open in the form; null while adding a new one */
  editing: FeedingPlace | null;
  saving: boolean;
  saveError: string | null;
  /** Ids of places currently being deleted */
  deleting: string[];
  deleteError: string | null;
}

export const initialState: FeedingState = {
  places: [],
  loading: false,
  loadError: null,
  placeType: null,
  pageIndex: 0,
  formOpen: false,
  editing: null,
  saving: false,
  saveError: null,
  deleting: [],
  deleteError: null,
};

/** Places have no date, so they are listed in the order of their types and each type is ordered by its note */
function compareOrder(a: FeedingPlace, b: FeedingPlace): number {
  return FEEDING_PLACE_TYPES.indexOf(a.type) - FEEDING_PLACE_TYPES.indexOf(b.type) || a.note.localeCompare(b.note);
}

export const feedingFeature = createFeature({
  name: 'feeding',
  reducer: createReducer(
    initialState,
    on(FeedingActions.load, (state): FeedingState => ({ ...state, loading: true, loadError: null })),
    on(FeedingActions.loadSuccess, (state, { places }): FeedingState => ({ ...state, places, loading: false })),
    on(FeedingActions.loadFailure, (state, { error }): FeedingState => ({ ...state, loading: false, loadError: error })),
    // A different filter starts again at the first page
    on(FeedingActions.setType, (state, { placeType }): FeedingState => ({ ...state, placeType, pageIndex: 0 })),
    on(FeedingActions.goToPage, (state, { pageIndex }): FeedingState => ({ ...state, pageIndex })),
    on(FeedingActions.startAdd, (state): FeedingState => ({ ...state, formOpen: true, editing: null, saveError: null })),
    on(FeedingActions.startEdit, (state, { place }): FeedingState => ({ ...state, formOpen: true, editing: place, saveError: null })),
    on(FeedingActions.closeForm, (state): FeedingState => ({ ...state, formOpen: false, editing: null })),
    on(FeedingActions.addPlace, FeedingActions.updatePlace, (state): FeedingState => ({ ...state, saving: true, saveError: null })),
    on(
      FeedingActions.addPlaceSuccess,
      FeedingActions.updatePlaceSuccess,
      (state): FeedingState => ({ ...state, saving: false, formOpen: false, editing: null }),
    ),
    on(
      FeedingActions.addPlaceFailure,
      FeedingActions.updatePlaceFailure,
      (state, { error }): FeedingState => ({ ...state, saving: false, saveError: error }),
    ),
    on(
      FeedingActions.deletePlace,
      (state, { id }): FeedingState => ({ ...state, deleting: [...state.deleting, id], deleteError: null }),
    ),
    on(
      FeedingActions.deletePlaceSuccess,
      (state, { id }): FeedingState => ({
        ...state,
        // Remove it right away; the places are reloaded afterwards
        places: state.places.filter((place) => place.id !== id),
        deleting: state.deleting.filter((deleting) => deleting !== id),
      }),
    ),
    on(
      FeedingActions.deletePlaceFailure,
      (state, { id, error }): FeedingState => ({
        ...state,
        deleting: state.deleting.filter((deleting) => deleting !== id),
        deleteError: error,
      }),
    ),
  ),
  extraSelectors: ({ selectPlaces, selectPlaceType, selectPageIndex }) => {
    /** The places of the list, filtered and ordered */
    const selectListed = createSelector(selectPlaces, selectPlaceType, (places, placeType) =>
      [...(placeType === null ? places : places.filter((place) => place.type === placeType))].sort(compareOrder),
    );
    const selectTotal = createSelector(selectListed, (places) => places.length);
    const selectPageCount = createSelector(selectTotal, (total) => Math.max(1, Math.ceil(total / FEEDING_PAGE_SIZE)));
    /** Stays on the last page when deleting its last place leaves it empty */
    const selectCurrentPage = createSelector(selectPageIndex, selectPageCount, (pageIndex, pageCount) =>
      Math.min(pageIndex, pageCount - 1),
    );
    return {
      selectListed,
      selectTotal,
      selectPageCount,
      selectCurrentPage,
      selectPage: createSelector(selectListed, selectCurrentPage, (places, pageIndex) =>
        places.slice(pageIndex * FEEDING_PAGE_SIZE, (pageIndex + 1) * FEEDING_PAGE_SIZE),
      ),
      /** All places with a known position, for the map, regardless of the list's filter */
      selectLocated: createSelector(selectPlaces, (places) => places.filter((place) => place.location !== null)),
    };
  },
});

export const {
  selectLoading,
  selectLoadError,
  selectPlaceType,
  selectFormOpen,
  selectEditing,
  selectSaving,
  selectSaveError,
  selectDeleting,
  selectDeleteError,
  selectTotal,
  selectPageCount,
  selectCurrentPage,
  selectPage,
  selectLocated,
} = feedingFeature;
