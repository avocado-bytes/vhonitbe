import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { firstValueFrom, Observable, Subject } from 'rxjs';
import { LoadSeries } from '../../model/load-series';
import { AmmunitionStorage } from '../../storage/ammunition-storage';
import { LoadSeriesStorage } from '../../storage/load-series-storage';
import { HandloadingActions } from './handloading.actions';
import { addSeries, deleteSeries, loadSeries, promoteLoad, updateSeries } from './handloading.effects';

describe('handloading effects', () => {
  let actions$: Subject<Action>;
  const storage = { getAll: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const ammunitionStorage = { add: vi.fn() };
  const series: LoadSeries = {
    id: 's1',
    caliber: '.308 Win',
    bulletWeight: 168,
    loads: [{ id: 'l1', powderCharge: 44.5, overallLength: 71.1, shots: 3, groupSize: 18, velocities: [812, 818], notes: '' }],
  };

  beforeEach(() => {
    actions$ = new Subject<Action>();
    [...Object.values(storage), ammunitionStorage.add].forEach((mock) => mock.mockReset());
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        { provide: LoadSeriesStorage, useValue: storage },
        { provide: AmmunitionStorage, useValue: ammunitionStorage },
      ],
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

  it('should add, update and delete a series, or report a failure', async () => {
    storage.add.mockResolvedValueOnce(series);
    storage.update.mockResolvedValueOnce(series).mockRejectedValueOnce(new Error('boom'));
    storage.delete.mockResolvedValueOnce(undefined);

    expect(await run(addSeries, HandloadingActions.addSeries({ series: { caliber: '.308 Win' } }))).toEqual(
      HandloadingActions.addSeriesSuccess({ series }),
    );
    expect(await run(updateSeries, HandloadingActions.updateSeries({ series }))).toEqual(HandloadingActions.updateSeriesSuccess({ series }));
    expect(await run(updateSeries, HandloadingActions.updateSeries({ series }))).toEqual(
      HandloadingActions.updateSeriesFailure({ error: 'Error: boom' }),
    );
    expect(await run(deleteSeries, HandloadingActions.deleteSeries({ id: 's1' }))).toEqual(HandloadingActions.deleteSeriesSuccess({ id: 's1' }));
  });

  it('should add the test load to the ammunition, then mark it as added in its series', async () => {
    const ammunition = { id: 'a1' };
    ammunitionStorage.add.mockResolvedValue(ammunition);
    storage.update.mockImplementation(async (updated: LoadSeries) => updated);

    const action = (await run(promoteLoad, HandloadingActions.promoteLoad({ series, loadId: 'l1' }))) as ReturnType<
      typeof HandloadingActions.promoteLoadSuccess
    >;

    expect(ammunitionStorage.add).toHaveBeenCalledWith(expect.objectContaining({ caliber: '.308 Win', source: 'handload', muzzleVelocity: 815 }));
    expect(action.type).toBe(HandloadingActions.promoteLoadSuccess.type);
    expect(action.ammunition).toBe(ammunition);
    expect(action.series.loads?.[0].promotedAt).toEqual(expect.any(String));
    expect(ammunitionStorage.add.mock.invocationCallOrder[0]).toBeLessThan(storage.update.mock.invocationCallOrder[0]);
  });

  it('should not mark the load when the ammunition could not be added', async () => {
    ammunitionStorage.add.mockRejectedValue(new Error('full'));

    expect(await run(promoteLoad, HandloadingActions.promoteLoad({ series, loadId: 'l1' }))).toEqual(
      HandloadingActions.promoteLoadFailure({ loadId: 'l1', error: 'Error: full' }),
    );
    expect(storage.update).not.toHaveBeenCalled();
  });
});
