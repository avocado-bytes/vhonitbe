import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { firstValueFrom, Subject } from 'rxjs';
import { HuntingEvent } from '../../model/event';
import { Item } from '../../model/item';
import { EventStorage } from '../../storage/event-storage';
import { EventsActions } from '../events/events.actions';
import { FeedingActions } from './feeding.actions';
import { loadFeeding, reloadFeedingAfterChange } from './feeding.effects';

describe('feeding effects', () => {
  let actions$: Subject<Action>;
  const getByType = vi.fn<(type: Item) => Promise<HuntingEvent[]>>();
  const event = (id: string, type: Item, occurredAt: string) => ({ id, type, occurredAt }) as HuntingEvent;

  beforeEach(() => {
    actions$ = new Subject<Action>();
    getByType.mockReset();
    TestBed.configureTestingModule({
      providers: [provideMockActions(() => actions$), { provide: EventStorage, useValue: { getByType } }],
    });
  });

  it('should load the feeding and salt lick events, newest first', async () => {
    getByType.mockImplementation(async (type) =>
      type === 'feeding'
        ? [event('old', 'feeding', '2026-01-01T00:00:00.000Z'), event('new', 'feeding', '2026-03-01T00:00:00.000Z')]
        : [event('lick', 'salt-lick', '2026-02-01T00:00:00.000Z')],
    );
    const result = TestBed.runInInjectionContext(() => firstValueFrom(loadFeeding()));

    actions$.next(FeedingActions.load());

    const action = (await result) as ReturnType<typeof FeedingActions.loadSuccess>;
    expect(getByType.mock.calls.map(([type]) => type)).toEqual(['feeding', 'salt-lick']);
    expect(action.events.map((e) => e.id)).toEqual(['new', 'lick', 'old']);
  });

  it('should report a failure to load', async () => {
    getByType.mockRejectedValue(new Error('boom'));
    const result = TestBed.runInInjectionContext(() => firstValueFrom(loadFeeding()));

    actions$.next(FeedingActions.load());

    expect(await result).toEqual(FeedingActions.loadFailure({ error: 'Error: boom' }));
  });

  it('should reload after an event was changed', async () => {
    const result = TestBed.runInInjectionContext(() => firstValueFrom(reloadFeedingAfterChange()));

    actions$.next(EventsActions.deleteEventSuccess({ id: 'a' }));

    expect(await result).toEqual(FeedingActions.load());
  });
});
