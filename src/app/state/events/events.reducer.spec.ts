import { HuntingEvent, NewHuntingEvent } from '../../model/event';
import { EventsActions } from './events.actions';
import { eventsFeature, initialState, selectPageCount } from './events.reducer';

describe('events reducer', () => {
  const { reducer } = eventsFeature;
  const draft: NewHuntingEvent = { type: 'harvest', animal: 'wild-boar', location: null, note: '', occurredAt: '2026-10-01T06:30:00.000Z' };
  const stored: HuntingEvent = { ...draft, id: 'id-1', createdAt: '2026-10-01T06:31:00.000Z', updatedAt: '2026-10-01T06:31:00.000Z' };

  describe('loading pages', () => {
    it('should mark loading and clear a previous error', () => {
      const state = reducer({ ...initialState, loadError: 'boom' }, EventsActions.loadPage({ pageIndex: 1 }));
      expect(state).toEqual({ ...initialState, loading: true, loadError: null });
    });

    it('should store the loaded page', () => {
      const state = reducer(
        { ...initialState, loading: true },
        EventsActions.loadPageSuccess({ pageIndex: 2, events: [stored], total: 21 }),
      );
      expect(state).toEqual({ ...initialState, pageIndex: 2, events: [stored], total: 21, loading: false });
    });

    it('should keep the current page when loading fails', () => {
      const loaded = { ...initialState, events: [stored], total: 1, loading: true };
      const state = reducer(loaded, EventsActions.loadPageFailure({ error: 'boom' }));
      expect(state).toEqual({ ...loaded, loading: false, loadError: 'boom' });
    });
  });

  it('should store the latest events', () => {
    const state = reducer(initialState, EventsActions.loadLatestSuccess({ events: [stored] }));
    expect(state).toEqual({ ...initialState, latest: [stored] });
  });

  describe('adding events', () => {
    it('should mark saving and clear a previous error', () => {
      const state = reducer({ ...initialState, saveError: 'boom' }, EventsActions.addEvent({ event: draft }));
      expect(state).toEqual({ ...initialState, saving: true, saveError: null });
    });

    it('should stop saving on success', () => {
      const state = reducer({ ...initialState, saving: true }, EventsActions.addEventSuccess({ event: stored }));
      expect(state).toEqual(initialState);
    });

    it('should keep the error on failure', () => {
      const state = reducer({ ...initialState, saving: true }, EventsActions.addEventFailure({ error: 'QuotaExceededError' }));
      expect(state).toEqual({ ...initialState, saveError: 'QuotaExceededError' });
    });
  });

  describe('editing events', () => {
    const edited: HuntingEvent = { ...stored, type: 'spotting' };

    it('should remember the event being edited and clear a previous save error', () => {
      const state = reducer({ ...initialState, saveError: 'boom' }, EventsActions.startEdit({ event: stored }));
      expect(state).toEqual({ ...initialState, editing: stored });
    });

    it('should forget the event when editing is cancelled', () => {
      const state = reducer({ ...initialState, editing: stored }, EventsActions.cancelEdit());
      expect(state).toEqual(initialState);
    });

    it('should mark saving when updating', () => {
      const state = reducer({ ...initialState, editing: stored }, EventsActions.updateEvent({ event: edited }));
      expect(state).toEqual({ ...initialState, editing: stored, saving: true });
    });

    it('should replace the event on the page and stop editing on success', () => {
      const other: HuntingEvent = { ...stored, id: 'id-2' };
      const state = reducer(
        { ...initialState, events: [other, stored], total: 2, editing: stored, saving: true },
        EventsActions.updateEventSuccess({ event: edited }),
      );
      expect(state).toEqual({ ...initialState, events: [other, edited], total: 2 });
    });

    it('should keep editing and store the error on failure', () => {
      const state = reducer({ ...initialState, editing: stored, saving: true }, EventsActions.updateEventFailure({ error: 'boom' }));
      expect(state).toEqual({ ...initialState, editing: stored, saveError: 'boom' });
    });
  });

  describe('deleting events', () => {
    const other: HuntingEvent = { ...stored, id: 'id-2' };

    it('should track the event being deleted and clear a previous error', () => {
      const state = reducer({ ...initialState, deleteError: 'boom' }, EventsActions.deleteEvent({ id: 'id-1' }));
      expect(state).toEqual({ ...initialState, deleting: ['id-1'], deleteError: null });
    });

    it('should remove the deleted event from the page and the total', () => {
      const state = reducer(
        { ...initialState, events: [stored, other], total: 12, deleting: ['id-1', 'id-2'] },
        EventsActions.deleteEventSuccess({ id: 'id-1' }),
      );
      expect(state).toEqual({ ...initialState, events: [other], total: 11, deleting: ['id-2'] });
    });

    it('should keep the event and store the error on failure', () => {
      const state = reducer(
        { ...initialState, events: [stored], total: 1, deleting: ['id-1'] },
        EventsActions.deleteEventFailure({ id: 'id-1', error: 'boom' }),
      );
      expect(state).toEqual({ ...initialState, events: [stored], total: 1, deleteError: 'boom' });
    });
  });

  it.each([
    [0, 1],
    [10, 1],
    [11, 2],
    [25, 3],
  ])('should count %i events as %i page(s)', (total, pages) => {
    expect(selectPageCount.projector(total, 10)).toBe(pages);
  });
});
