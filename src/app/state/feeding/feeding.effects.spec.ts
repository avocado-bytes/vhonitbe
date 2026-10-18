import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, Observable, Subject } from 'rxjs';
import { FeedingPlace } from '../../model/feeding-place';
import { EventStorage } from '../../storage/event-storage';
import { FeedingPlaceStorage } from '../../storage/feeding-place-storage';
import { FeedingActions } from './feeding.actions';
import { provideMockStore } from '@ngrx/store/testing';
import { FEEDING_SETTINGS_STORAGE_KEY } from '../../model/feeding-settings';
import {
  addPlace,
  deletePlace,
  loadFeeding,
  loadFeedingOnStartup,
  persistFeedingSettings,
  reloadFeedingAfterChange,
  replenishPlace,
  sharePlace,
  updatePlace,
} from './feeding.effects';
import { initialState } from './feeding.reducer';

describe('feeding effects', () => {
  let actions$: Subject<Action>;
  const storage = {
    getAll: vi.fn<() => Promise<FeedingPlace[]>>(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const share = vi.fn<(data: ShareData) => Promise<void>>();
  const place: FeedingPlace = { id: 'a', type: 'salt-lick', location: null, note: 'Secret', photoId: null };

  beforeEach(() => {
    actions$ = new Subject<Action>();
    Object.values(storage).forEach((mock) => mock.mockReset());
    share.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { feeding: { ...initialState, settings: { seasonStart: 11, seasonEnd: 2, replenishDays: 7 } } } }),
        { provide: FeedingPlaceStorage, useValue: storage },
        { provide: EventStorage, useValue: { getPhoto: vi.fn() } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: DOCUMENT, useValue: { defaultView: { navigator: { share } } } },
      ],
    });
  });

  const run = <T>(effect: () => Observable<T>, action: Action) => {
    const result = TestBed.runInInjectionContext(() => firstValueFrom(effect()));
    actions$.next(action);
    return result;
  };

  it('should load the feeding places when the application starts', async () => {
    expect(await run(loadFeedingOnStartup, { type: ROOT_EFFECTS_INIT })).toEqual(FeedingActions.load());
  });

  it('should load all feeding places', async () => {
    storage.getAll.mockResolvedValue([place]);

    expect(await run(loadFeeding, FeedingActions.load())).toEqual(FeedingActions.loadSuccess({ places: [place] }));
  });

  it('should report a failure to load', async () => {
    storage.getAll.mockRejectedValue(new Error('boom'));

    expect(await run(loadFeeding, FeedingActions.load())).toEqual(FeedingActions.loadFailure({ error: 'Error: boom' }));
  });

  it('should add, update and delete a place', async () => {
    storage.add.mockResolvedValue(place);
    storage.update.mockResolvedValue(place);
    storage.delete.mockResolvedValue(undefined);
    const { id, ...fields } = place;

    expect(await run(addPlace, FeedingActions.addPlace({ place: fields }))).toEqual(FeedingActions.addPlaceSuccess({ place }));
    expect(await run(updatePlace, FeedingActions.updatePlace({ place }))).toEqual(FeedingActions.updatePlaceSuccess({ place }));
    expect(await run(deletePlace, FeedingActions.deletePlace({ id }))).toEqual(FeedingActions.deletePlaceSuccess({ id }));
  });

  it('should report a failure to save', async () => {
    storage.update.mockRejectedValue(new Error('boom'));

    expect(await run(updatePlace, FeedingActions.updatePlace({ place }))).toEqual(
      FeedingActions.updatePlaceFailure({ error: 'Error: boom' }),
    );
  });

  it('should reload after a place was changed', async () => {
    expect(await run(reloadFeedingAfterChange, FeedingActions.deletePlaceSuccess({ id: 'a' }))).toEqual(FeedingActions.load());
  });

  it('should share the type without a date or the note', async () => {
    expect(await run(sharePlace, FeedingActions.sharePlace({ place }))).toEqual(
      FeedingActions.sharePlaceSuccess({ result: 'shared' }),
    );
    expect(share).toHaveBeenCalledWith({ text: 'FEEDING.TYPES.salt-lick' });
  });

  it('should remember the feeding settings', async () => {
    localStorage.clear();

    await run(persistFeedingSettings, FeedingActions.setReplenishDays({ replenishDays: 7 }));

    expect(JSON.parse(localStorage.getItem(FEEDING_SETTINGS_STORAGE_KEY)!)).toEqual({ seasonStart: 11, seasonEnd: 2, replenishDays: 7 });
  });

  it('should store the current date and time as the last replenishment', async () => {
    storage.update.mockImplementation(async (updated: FeedingPlace) => updated);
    const before = Date.now();

    const action = (await run(replenishPlace, FeedingActions.replenishPlace({ place }))) as ReturnType<
      typeof FeedingActions.replenishPlaceSuccess
    >;

    expect(action.type).toBe(FeedingActions.replenishPlaceSuccess.type);
    expect(action.place).toEqual({ ...place, lastReplenishedAt: expect.any(String) });
    expect(new Date(action.place.lastReplenishedAt!).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('should report a failure to replenish', async () => {
    storage.update.mockRejectedValue(new Error('boom'));

    expect(await run(replenishPlace, FeedingActions.replenishPlace({ place }))).toEqual(
      FeedingActions.replenishPlaceFailure({ id: 'a', error: 'Error: boom' }),
    );
  });
});
