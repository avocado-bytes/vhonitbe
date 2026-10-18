import { HuntingEvent } from '../../model/event';
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
  const event = (id: string, overrides: Partial<HuntingEvent> = {}): HuntingEvent => ({
    id,
    type: 'feeding',
    animal: null,
    location: { latitude: 49, longitude: 13.5 },
    note: '',
    occurredAt: '2026-10-01T06:30:00.000Z',
    createdAt: '2026-10-01T06:31:00.000Z',
    updatedAt: '2026-10-01T06:31:00.000Z',
    ...overrides,
  });
  const root = (feeding: Partial<FeedingState>) => ({ feeding: { ...initialState, ...feeding } });

  it('should mark loading and store the loaded events', () => {
    const loading = reducer({ ...initialState, loadError: 'boom' }, FeedingActions.load());
    expect(loading).toEqual({ ...initialState, loading: true, loadError: null });

    const events = [event('a')];
    expect(reducer(loading, FeedingActions.loadSuccess({ events }))).toEqual({ ...initialState, events });
  });

  it('should store a load failure', () => {
    const state = reducer({ ...initialState, loading: true }, FeedingActions.loadFailure({ error: 'boom' }));
    expect(state).toEqual({ ...initialState, loadError: 'boom' });
  });

  it('should start at the first page when the order or filter changes', () => {
    const onPage = { ...initialState, pageIndex: 2 };
    expect(reducer(onPage, FeedingActions.setSort({ sort: 'oldest' }))).toEqual({ ...initialState, sort: 'oldest' });
    expect(reducer(onPage, FeedingActions.setItem({ item: 'salt-lick' }))).toEqual({ ...initialState, item: 'salt-lick' });
  });

  describe('selectors', () => {
    const events = [event('a'), event('b', { type: 'salt-lick', location: null }), event('c')];

    it('should filter by item and reverse the order for oldest first', () => {
      expect(selectPage(root({ events, item: 'salt-lick' })).map((e) => e.id)).toEqual(['b']);
      expect(selectPage(root({ events, sort: 'oldest' })).map((e) => e.id)).toEqual(['c', 'b', 'a']);
    });

    it('should show all places with a location on the map regardless of the filter', () => {
      expect(selectLocated(root({ events, item: 'salt-lick' })).map((e) => e.id)).toEqual(['a', 'c']);
    });

    it('should page the list and stay on the last page when it shrinks', () => {
      const many = Array.from({ length: FEEDING_PAGE_SIZE + 3 }, (_, i) => event(`e${i}`));

      expect(selectTotal(root({ events: many }))).toBe(FEEDING_PAGE_SIZE + 3);
      expect(selectPageCount(root({ events: many }))).toBe(2);
      expect(selectPage(root({ events: many, pageIndex: 1 }))).toHaveLength(3);
      expect(selectCurrentPage(root({ events: many.slice(0, 5), pageIndex: 1 }))).toBe(0);
    });
  });
});
