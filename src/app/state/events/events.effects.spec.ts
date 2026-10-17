import { TestBed } from '@angular/core/testing';
import { ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { DEFAULT_EVENT_QUERY, HuntingEvent, NewHuntingEvent } from '../../model/event';
import { EventStorage } from '../../storage/event-storage';
import { EventsActions } from './events.actions';
import {
  addEvent,
  deleteEvent,
  loadLatest,
  loadOnStartup,
  loadPage,
  reloadAfterAdd,
  reloadAfterDelete,
  reloadAfterUpdate,
  reloadLatestAfterChange,
  requestPersistentStorage,
  updateEvent,
} from './events.effects';
import { EventsState, initialState } from './events.reducer';

describe('events effects', () => {
  const draft: NewHuntingEvent = { type: 'spotting', animal: 'roe-deer', location: null, note: '', occurredAt: '2026-10-01T06:30:00.000Z' };
  const stored: HuntingEvent = { ...draft, id: 'id-1', createdAt: '2026-10-01T06:31:00.000Z', updatedAt: '2026-10-01T06:31:00.000Z' };

  function run<T>(
    effect: () => Observable<T>,
    action: Action,
    storage: Partial<EventStorage> = {},
    events: Partial<EventsState> = {},
  ): Promise<T> {
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => of(action)),
        provideMockStore({ initialState: { events: { ...initialState, pageSize: 10, ...events } } }),
        { provide: EventStorage, useValue: storage },
      ],
    });
    return TestBed.runInInjectionContext(() => firstValueFrom(effect()));
  }

  it('should ask for persistent storage on startup', async () => {
    const requestPersistence = vi.fn().mockResolvedValue(true);

    await run(requestPersistentStorage, { type: ROOT_EFFECTS_INIT }, { requestPersistence });

    expect(requestPersistence).toHaveBeenCalled();
  });

  it('should not fail when persistent storage cannot be requested', async () => {
    const requestPersistence = vi.fn().mockRejectedValue(new Error('not allowed'));

    expect(await run(requestPersistentStorage, { type: ROOT_EFFECTS_INIT }, { requestPersistence })).toBe(false);
  });

  it('should load the first page on startup', async () => {
    expect(await run(loadOnStartup, { type: ROOT_EFFECTS_INIT })).toEqual(EventsActions.loadPage({ pageIndex: 0 }));
  });

  it('should reload the first page after an event was added', async () => {
    expect(await run(reloadAfterAdd, EventsActions.addEventSuccess({ event: stored }))).toEqual(
      EventsActions.loadPage({ pageIndex: 0 }),
    );
  });

  describe('latest events', () => {
    it('should load the 10 newest events', async () => {
      const getPage = vi.fn().mockResolvedValue({ events: [stored], total: 30 });

      expect(await run(loadLatest, EventsActions.loadLatest(), { getPage })).toEqual(
        EventsActions.loadLatestSuccess({ events: [stored] }),
      );
      expect(getPage).toHaveBeenCalledWith(0, 10);
    });

    it('should dispatch failure when loading fails', async () => {
      const getPage = vi.fn().mockRejectedValue(new Error('boom'));

      expect(await run(loadLatest, EventsActions.loadLatest(), { getPage })).toEqual(
        EventsActions.loadLatestFailure({ error: 'Error: boom' }),
      );
    });

    it.each([
      ['added', EventsActions.addEventSuccess({ event: stored })],
      ['updated', EventsActions.updateEventSuccess({ event: stored })],
      ['deleted', EventsActions.deleteEventSuccess({ id: stored.id })],
    ])('should reload them after an event was %s', async (_, action) => {
      expect(await run(reloadLatestAfterChange, action)).toEqual(EventsActions.loadLatest());
    });
  });

  describe('loadPage', () => {
    it('should load the requested page from storage', async () => {
      const getPage = vi.fn().mockResolvedValue({ events: [stored], total: 21 });

      expect(await run(loadPage, EventsActions.loadPage({ pageIndex: 2 }), { getPage })).toEqual(
        EventsActions.loadPageSuccess({ pageIndex: 2, events: [stored], total: 21 }),
      );
      expect(getPage).toHaveBeenCalledWith(20, 10, DEFAULT_EVENT_QUERY);
    });

    it('should dispatch failure when loading fails', async () => {
      const getPage = vi.fn().mockRejectedValue(new Error('boom'));

      expect(await run(loadPage, EventsActions.loadPage({ pageIndex: 0 }), { getPage })).toEqual(
        EventsActions.loadPageFailure({ error: 'Error: boom' }),
      );
    });
  });

  describe('addEvent', () => {
    it('should persist the event and dispatch success with the stored event', async () => {
      const add = vi.fn().mockResolvedValue(stored);

      expect(await run(addEvent, EventsActions.addEvent({ event: draft }), { add })).toEqual(
        EventsActions.addEventSuccess({ event: stored }),
      );
      expect(add).toHaveBeenCalledWith(draft);
    });

    it('should dispatch failure when persisting fails', async () => {
      const add = vi.fn().mockRejectedValue(new Error('QuotaExceededError'));

      expect(await run(addEvent, EventsActions.addEvent({ event: draft }), { add })).toEqual(
        EventsActions.addEventFailure({ error: 'Error: QuotaExceededError' }),
      );
    });
  });

  describe('updateEvent', () => {
    it('should update the event in storage and dispatch success with the stored event', async () => {
      const updated = { ...stored, updatedAt: '2026-10-02T08:00:00.000Z' };
      const update = vi.fn().mockResolvedValue(updated);

      expect(await run(updateEvent, EventsActions.updateEvent({ event: stored }), { update })).toEqual(
        EventsActions.updateEventSuccess({ event: updated }),
      );
      expect(update).toHaveBeenCalledWith(stored);
    });

    it('should dispatch failure when updating fails', async () => {
      const update = vi.fn().mockRejectedValue(new Error('Event id-1 does not exist'));

      expect(await run(updateEvent, EventsActions.updateEvent({ event: stored }), { update })).toEqual(
        EventsActions.updateEventFailure({ error: 'Error: Event id-1 does not exist' }),
      );
    });
  });

  it('should reload the current page after an event was updated', async () => {
    expect(
      await run(reloadAfterUpdate, EventsActions.updateEventSuccess({ event: stored }), {}, { pageIndex: 2, total: 30 }),
    ).toEqual(EventsActions.loadPage({ pageIndex: 2 }));
  });

  describe('deleteEvent', () => {
    it('should delete the event from storage and dispatch success', async () => {
      const remove = vi.fn().mockResolvedValue(undefined);

      expect(await run(deleteEvent, EventsActions.deleteEvent({ id: 'id-1' }), { delete: remove })).toEqual(
        EventsActions.deleteEventSuccess({ id: 'id-1' }),
      );
      expect(remove).toHaveBeenCalledWith('id-1');
    });

    it('should dispatch failure when deleting fails', async () => {
      const remove = vi.fn().mockRejectedValue(new Error('boom'));

      expect(await run(deleteEvent, EventsActions.deleteEvent({ id: 'id-1' }), { delete: remove })).toEqual(
        EventsActions.deleteEventFailure({ id: 'id-1', error: 'Error: boom' }),
      );
    });
  });

  describe('reloadAfterDelete', () => {
    // The reducer has already removed the deleted event from `total` when this runs
    it('should reload the current page', async () => {
      expect(
        await run(reloadAfterDelete, EventsActions.deleteEventSuccess({ id: 'id-1' }), {}, { pageIndex: 1, total: 24 }),
      ).toEqual(EventsActions.loadPage({ pageIndex: 1 }));
    });

    it('should step back a page when the last event of the last page was deleted', async () => {
      expect(
        await run(reloadAfterDelete, EventsActions.deleteEventSuccess({ id: 'id-1' }), {}, { pageIndex: 2, total: 20 }),
      ).toEqual(EventsActions.loadPage({ pageIndex: 1 }));
    });

    it('should stay on the first page when the last event was deleted', async () => {
      expect(
        await run(reloadAfterDelete, EventsActions.deleteEventSuccess({ id: 'id-1' }), {}, { pageIndex: 0, total: 0 }),
      ).toEqual(EventsActions.loadPage({ pageIndex: 0 }));
    });
  });
});
