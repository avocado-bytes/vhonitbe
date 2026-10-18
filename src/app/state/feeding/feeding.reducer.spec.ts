import { FeedingPlace } from '../../model/feeding-place';
import { FeedingActions } from './feeding.actions';
import {
  FEEDING_PAGE_SIZE,
  feedingFeature,
  FeedingState,
  initialState,
  selectCurrentPage,
  selectLocated,
  selectPage,
  selectPageCount,
  selectTotal,
} from './feeding.reducer';

describe('feeding reducer', () => {
  const { reducer } = feedingFeature;
  const place = (id: string, overrides: Partial<FeedingPlace> = {}): FeedingPlace => ({
    id,
    type: 'feeding',
    location: { latitude: 49, longitude: 13.5 },
    note: '',
    photoId: null,
    ...overrides,
  });
  const root = (feeding: Partial<FeedingState>) => ({ feeding: { ...initialState, ...feeding } });

  it('should mark loading and store the loaded places', () => {
    const loading = reducer({ ...initialState, loadError: 'boom' }, FeedingActions.load());
    expect(loading).toEqual({ ...initialState, loading: true, loadError: null });

    const places = [place('a')];
    expect(reducer(loading, FeedingActions.loadSuccess({ places }))).toEqual({ ...initialState, places });
  });

  it('should store a load failure', () => {
    const state = reducer({ ...initialState, loading: true }, FeedingActions.loadFailure({ error: 'boom' }));
    expect(state).toEqual({ ...initialState, loadError: 'boom' });
  });

  it('should start at the first page when the filter changes', () => {
    const onPage = { ...initialState, pageIndex: 2 };
    expect(reducer(onPage, FeedingActions.setType({ placeType: 'salt-lick' }))).toEqual({ ...initialState, placeType: 'salt-lick' });
  });

  describe('form', () => {
    it('should open empty for adding and with the place for editing, clearing an old save error', () => {
      const failed = { ...initialState, saveError: 'boom' };

      expect(reducer(failed, FeedingActions.startAdd())).toEqual({ ...initialState, formOpen: true });
      expect(reducer(failed, FeedingActions.startEdit({ place: place('a') }))).toEqual({
        ...initialState,
        formOpen: true,
        editing: place('a'),
      });
    });

    it('should close when cancelled or once saved', () => {
      const open = { ...initialState, formOpen: true, editing: place('a') };

      expect(reducer(open, FeedingActions.closeForm())).toEqual(initialState);
      const saving = reducer(open, FeedingActions.updatePlace({ place: place('a') }));
      expect(saving.saving).toBe(true);
      expect(reducer(saving, FeedingActions.updatePlaceSuccess({ place: place('a') }))).toEqual(initialState);
    });

    it('should stay open with the error when saving failed', () => {
      const saving = { ...initialState, formOpen: true, saving: true };

      expect(reducer(saving, FeedingActions.addPlaceFailure({ error: 'boom' }))).toEqual({
        ...initialState,
        formOpen: true,
        saveError: 'boom',
      });
    });
  });

  it('should track deleting and remove a deleted place', () => {
    const state = { ...initialState, places: [place('a'), place('b')] };
    const deleting = reducer(state, FeedingActions.deletePlace({ id: 'a' }));
    expect(deleting.deleting).toEqual(['a']);

    expect(reducer(deleting, FeedingActions.deletePlaceSuccess({ id: 'a' }))).toEqual({ ...initialState, places: [place('b')] });
    expect(reducer(deleting, FeedingActions.deletePlaceFailure({ id: 'a', error: 'boom' }))).toEqual({
      ...state,
      deleteError: 'boom',
    });
  });

  describe('selectors', () => {
    const places = [
      place('lick', { type: 'salt-lick', location: null }),
      place('pile', { type: 'feed-pile' }),
      place('b', { note: 'North' }),
      place('bait', { type: 'bait-site' }),
      place('a', { note: 'East' }),
    ];

    it('should list the places in the order of their types, each type ordered by note, and filter by type', () => {
      expect(selectPage(root({ places })).map((p) => p.id)).toEqual(['a', 'b', 'pile', 'bait', 'lick']);
      expect(selectPage(root({ places, placeType: 'salt-lick' })).map((p) => p.id)).toEqual(['lick']);
    });

    it('should show all places with a location on the map regardless of the filter', () => {
      expect(selectLocated(root({ places, placeType: 'salt-lick' })).map((p) => p.id)).toEqual(['pile', 'b', 'bait', 'a']);
    });

    it('should page the list and stay on the last page when it shrinks', () => {
      const many = Array.from({ length: FEEDING_PAGE_SIZE + 3 }, (_, i) => place(`p${i}`));

      expect(selectTotal(root({ places: many }))).toBe(FEEDING_PAGE_SIZE + 3);
      expect(selectPageCount(root({ places: many }))).toBe(2);
      expect(selectPage(root({ places: many, pageIndex: 1 }))).toHaveLength(3);
      expect(selectCurrentPage(root({ places: many.slice(0, 5), pageIndex: 1 }))).toBe(0);
    });
  });
});
