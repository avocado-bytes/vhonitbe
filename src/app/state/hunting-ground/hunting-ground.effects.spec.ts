import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, Observable, Subject, take, toArray } from 'rxjs';
import { HuntingGround, HuntingGroundsResponse } from '../../model/hunting-ground';
import { HuntingGroundStorage } from '../../storage/hunting-ground-storage';
import { LocationActions } from '../location/location.actions';
import { initialState as locationInitialState } from '../location/location.reducer';
import { HuntingGroundActions } from './hunting-ground.actions';
import {
  chooseHuntingGround,
  loadHuntingGround,
  refreshHuntingGround,
  removeHuntingGround,
  searchHuntingGround,
} from './hunting-ground.effects';
import { initialState } from './hunting-ground.reducer';

describe('hunting ground effects', () => {
  let actions$: Subject<Action>;
  let store: MockStore;
  let http: HttpTestingController;
  const storage = { get: vi.fn(), save: vi.fn(), remove: vi.fn() };

  const searchedAt = { latitude: 49.72, longitude: 13.95 };
  /** A square around the searched point, in Web Mercator */
  const geometry = { type: 'Polygon' as const, coordinates: [[[1552000, 6390000], [1555000, 6390000], [1555000, 6400000], [1552000, 6400000], [1552000, 6390000]]] as [number, number][][] };
  const response = (code: string): HuntingGroundsResponse => ({
    features: [{ properties: { HONITBA: code, NAZEVHONITBY: 'BRDY', VYMERA_SA: 25665 }, geometry }],
  });
  const ground: HuntingGround = {
    code: 'CZ2120404111',
    name: 'BRDY',
    area: 25665,
    outline: [],
    searchedAt,
    fetchedAt: '2026-10-01T10:00:00.000Z',
  };

  beforeEach(() => {
    actions$ = new Subject<Action>();
    Object.values(storage).forEach((mock) => mock.mockReset());
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { location: locationInitialState, huntingGround: initialState } }),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: HuntingGroundStorage, useValue: storage },
      ],
    });
    store = TestBed.inject(MockStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const run = <T>(effect: () => Observable<T>, action: Action, count = 1) => {
    const result = TestBed.runInInjectionContext(() => firstValueFrom(effect().pipe(take(count), toArray())));
    actions$.next(action);
    return result;
  };
  const located = (position: { latitude: number; longitude: number } | null) =>
    store.setState({ location: { ...locationInitialState, position: position && { ...position, accuracy: 10 } }, huntingGround: initialState });

  it('should load the hunting ground or report a failure', async () => {
    storage.get.mockResolvedValueOnce(ground).mockRejectedValueOnce(new Error('boom'));

    expect(await run(loadHuntingGround, HuntingGroundActions.load())).toEqual([HuntingGroundActions.loadSuccess({ ground })]);
    expect(await run(loadHuntingGround, HuntingGroundActions.load())).toEqual([
      HuntingGroundActions.loadFailure({ error: 'Error: boom' }),
    ]);
  });

  it('should ask for the position, then look up the hunting grounds there', async () => {
    const result = run(searchHuntingGround, HuntingGroundActions.search(), 2);
    located(searchedAt);
    actions$.next(LocationActions.located({ position: { ...searchedAt, accuracy: 10 } }));

    const request = http.expectOne((req) => req.url.startsWith('https://gp.nli.gov.cz/wfs_uhul/service.svc/get?'));
    request.flush(response('CZ2120404111'));

    const [locate, success] = await result;
    expect(locate).toEqual(LocationActions.locate());
    expect(success).toEqual(
      HuntingGroundActions.searchSuccess({
        candidates: [expect.objectContaining({ code: 'CZ2120404111', name: 'BRDY', area: 25665, searchedAt })],
      }),
    );
  });

  it('should report a search without a position, or with the service unreachable', async () => {
    let result = run(searchHuntingGround, HuntingGroundActions.search(), 2);
    located(null);
    actions$.next(LocationActions.locateFailed({ error: 'denied' }));
    expect((await result)[1]).toEqual(HuntingGroundActions.searchFailure({ error: 'location' }));

    result = run(searchHuntingGround, HuntingGroundActions.search(), 2);
    located(searchedAt);
    actions$.next(LocationActions.located({ position: { ...searchedAt, accuracy: 10 } }));
    http.expectOne(() => true).flush('', { status: 503, statusText: 'Unavailable' });
    expect((await result)[1]).toEqual(HuntingGroundActions.searchFailure({ error: 'service' }));
  });

  it('should save the chosen hunting ground or report a failure', async () => {
    storage.save.mockResolvedValueOnce(ground).mockRejectedValueOnce(new Error('boom'));

    expect(await run(chooseHuntingGround, HuntingGroundActions.choose({ ground }))).toEqual([
      HuntingGroundActions.saveSuccess({ ground }),
    ]);
    expect(await run(chooseHuntingGround, HuntingGroundActions.choose({ ground }))).toEqual([
      HuntingGroundActions.saveFailure({ error: 'storage' }),
    ]);
  });

  describe('refresh', () => {
    beforeEach(() => store.setState({ location: locationInitialState, huntingGround: { ...initialState, ground } }));

    it('should download the boundary again where the hunting ground was found and save it', async () => {
      storage.save.mockImplementation(async (saved: HuntingGround) => saved);
      const result = run(refreshHuntingGround, HuntingGroundActions.refresh());

      http.expectOne(() => true).flush(response('CZ2120404111'));

      const [action] = await result;
      expect(action).toEqual(
        HuntingGroundActions.saveSuccess({ ground: expect.objectContaining({ code: 'CZ2120404111', searchedAt }) }),
      );
      expect((action as ReturnType<typeof HuntingGroundActions.saveSuccess>).ground.fetchedAt).not.toBe(ground.fetchedAt);
    });

    it('should keep the old boundary when the hunting ground is no longer there or the service fails', async () => {
      let result = run(refreshHuntingGround, HuntingGroundActions.refresh());
      http.expectOne(() => true).flush(response('CZ0000000000'));
      expect(await result).toEqual([HuntingGroundActions.saveFailure({ error: 'missing' })]);

      result = run(refreshHuntingGround, HuntingGroundActions.refresh());
      http.expectOne(() => true).flush('', { status: 503, statusText: 'Unavailable' });
      expect(await result).toEqual([HuntingGroundActions.saveFailure({ error: 'service' })]);
      expect(storage.save).not.toHaveBeenCalled();
    });
  });

  it('should remove the hunting ground or report a failure', async () => {
    storage.remove.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('boom'));

    expect(await run(removeHuntingGround, HuntingGroundActions.remove())).toEqual([HuntingGroundActions.removeSuccess()]);
    expect(await run(removeHuntingGround, HuntingGroundActions.remove())).toEqual([
      HuntingGroundActions.removeFailure({ error: 'Error: boom' }),
    ]);
  });
});
