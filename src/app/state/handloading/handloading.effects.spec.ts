import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { firstValueFrom, Observable, Subject } from 'rxjs';
import { LoadSeriesStorage } from '../../storage/load-series-storage';
import { HandloadingActions } from './handloading.actions';
import { addSeries, loadSeries } from './handloading.effects';

describe('handloading effects', () => {
  let actions$: Subject<Action>;
  const storage = { getAll: vi.fn(), add: vi.fn() };
  const series = { id: 'a', caliber: '.308 Win' };

  beforeEach(() => {
    actions$ = new Subject<Action>();
    Object.values(storage).forEach((mock) => mock.mockReset());
    TestBed.configureTestingModule({
      providers: [provideMockActions(() => actions$), { provide: LoadSeriesStorage, useValue: storage }],
    });
  });

  const run = <T>(effect: () => Observable<T>, action: Action) => {
    const result = TestBed.runInInjectionContext(() => firstValueFrom(effect()));
    actions$.next(action);
    return result;
  };

  it('should load the series or report a failure', async () => {
    storage.getAll.mockResolvedValueOnce([series]).mockRejectedValueOnce(new Error('boom'));

    expect(await run(loadSeries, HandloadingActions.load())).toEqual(HandloadingActions.loadSuccess({ series: [series] }));
    expect(await run(loadSeries, HandloadingActions.load())).toEqual(HandloadingActions.loadFailure({ error: 'Error: boom' }));
  });

  it('should add a series or report a failure', async () => {
    storage.add.mockResolvedValueOnce(series).mockRejectedValueOnce(new Error('boom'));

    expect(await run(addSeries, HandloadingActions.addSeries({ series: { caliber: '.308 Win' } }))).toEqual(
      HandloadingActions.addSeriesSuccess({ series }),
    );
    expect(await run(addSeries, HandloadingActions.addSeries({ series: { caliber: '.308 Win' } }))).toEqual(
      HandloadingActions.addSeriesFailure({ error: 'Error: boom' }),
    );
  });
});
