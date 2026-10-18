import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { EventSort, HuntingEvent } from '../../model/event';
import { FeedingItem } from '../../model/item';
import { FeedingActions } from './feeding.actions';

export const FEEDING_PAGE_SIZE = 10;

export interface FeedingState {
  /** All feeding and salt lick events, newest first; there are few enough to keep them all for the map */
  events: HuntingEvent[];
  loading: boolean;
  loadError: string | null;
  sort: EventSort;
  /** Only events of this item in the list; null for all */
  item: FeedingItem | null;
  /** Zero-based index of the shown page of the list */
  pageIndex: number;
}

export const initialState: FeedingState = {
  events: [],
  loading: false,
  loadError: null,
  sort: 'newest',
  item: null,
  pageIndex: 0,
};

export const feedingFeature = createFeature({
  name: 'feeding',
  reducer: createReducer(
    initialState,
    on(FeedingActions.load, (state): FeedingState => ({ ...state, loading: true, loadError: null })),
    on(FeedingActions.loadSuccess, (state, { events }): FeedingState => ({ ...state, events, loading: false })),
    on(FeedingActions.loadFailure, (state, { error }): FeedingState => ({ ...state, loading: false, loadError: error })),
    // A different order or filter starts again at the first page
    on(FeedingActions.setSort, (state, { sort }): FeedingState => ({ ...state, sort, pageIndex: 0 })),
    on(FeedingActions.setItem, (state, { item }): FeedingState => ({ ...state, item, pageIndex: 0 })),
    on(FeedingActions.goToPage, (state, { pageIndex }): FeedingState => ({ ...state, pageIndex })),
  ),
  extraSelectors: ({ selectEvents, selectSort, selectItem, selectPageIndex }) => {
    /** The events of the list, filtered and sorted */
    const selectListed = createSelector(selectEvents, selectSort, selectItem, (events, sort, item) => {
      const filtered = item === null ? events : events.filter((event) => event.type === item);
      return sort === 'newest' ? filtered : [...filtered].reverse();
    });
    const selectTotal = createSelector(selectListed, (events) => events.length);
    const selectPageCount = createSelector(selectTotal, (total) => Math.max(1, Math.ceil(total / FEEDING_PAGE_SIZE)));
    /** Stays on the last page when deleting its last event leaves it empty */
    const selectCurrentPage = createSelector(selectPageIndex, selectPageCount, (pageIndex, pageCount) =>
      Math.min(pageIndex, pageCount - 1),
    );
    return {
      selectListed,
      selectTotal,
      selectPageCount,
      selectCurrentPage,
      selectPage: createSelector(selectListed, selectCurrentPage, (events, pageIndex) =>
        events.slice(pageIndex * FEEDING_PAGE_SIZE, (pageIndex + 1) * FEEDING_PAGE_SIZE),
      ),
      /** All feeding places with a known position, for the map, regardless of the list's filter */
      selectLocated: createSelector(selectEvents, (events) => events.filter((event) => event.location !== null)),
    };
  },
});

export const {
  selectLoading,
  selectLoadError,
  selectSort,
  selectItem,
  selectTotal,
  selectPageCount,
  selectCurrentPage,
  selectPage,
  selectLocated,
} = feedingFeature;
