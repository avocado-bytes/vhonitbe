import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { firstValueFrom, Observable, Subject } from 'rxjs';
import { Ammunition } from '../../model/ammunition';
import { AmmunitionStorage } from '../../storage/ammunition-storage';
import { AmmunitionActions } from './ammunition.actions';
import { addAmmunition, deleteAmmunition, loadAmmunition, updateAmmunition } from './ammunition.effects';

describe('ammunition effects', () => {
  let actions$: Subject<Action>;
  const storage = { getAll: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const ammunition: Ammunition = {
    id: 'x',
    caliber: '.308 Win',
    source: 'factory',
    bulletWeight: 165,
    muzzleVelocity: 820,
    bulletType: '',
    ballisticCoefficient: null,
    primer: '',
    powder: '',
    brass: '',
    brassFirings: null,
  };

  beforeEach(() => {
    actions$ = new Subject<Action>();
    Object.values(storage).forEach((mock) => mock.mockReset());
    TestBed.configureTestingModule({
      providers: [provideMockActions(() => actions$), { provide: AmmunitionStorage, useValue: storage }],
    });
  });

  const run = <T>(effect: () => Observable<T>, action: Action) => {
    const result = TestBed.runInInjectionContext(() => firstValueFrom(effect()));
    actions$.next(action);
    return result;
  };

  it('should load the ammunition or report a failure', async () => {
    storage.getAll.mockResolvedValueOnce([ammunition]).mockRejectedValueOnce(new Error('boom'));

    expect(await run(loadAmmunition, AmmunitionActions.load())).toEqual(AmmunitionActions.loadSuccess({ ammunition: [ammunition] }));
    expect(await run(loadAmmunition, AmmunitionActions.load())).toEqual(AmmunitionActions.loadFailure({ error: 'Error: boom' }));
  });

  it('should add ammunition or report a failure', async () => {
    storage.add.mockResolvedValueOnce(ammunition).mockRejectedValueOnce(new Error('boom'));
    const { id: _id, ...fields } = ammunition;

    expect(await run(addAmmunition, AmmunitionActions.addAmmunition({ ammunition: fields }))).toEqual(
      AmmunitionActions.addAmmunitionSuccess({ ammunition }),
    );
    expect(await run(addAmmunition, AmmunitionActions.addAmmunition({ ammunition: fields }))).toEqual(
      AmmunitionActions.addAmmunitionFailure({ error: 'Error: boom' }),
    );
  });

  it('should update ammunition or report a failure', async () => {
    storage.update.mockResolvedValueOnce(ammunition).mockRejectedValueOnce(new Error('boom'));

    expect(await run(updateAmmunition, AmmunitionActions.updateAmmunition({ ammunition }))).toEqual(
      AmmunitionActions.updateAmmunitionSuccess({ ammunition }),
    );
    expect(await run(updateAmmunition, AmmunitionActions.updateAmmunition({ ammunition }))).toEqual(
      AmmunitionActions.updateAmmunitionFailure({ error: 'Error: boom' }),
    );
  });

  it('should delete ammunition or report a failure', async () => {
    storage.delete.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('boom'));

    expect(await run(deleteAmmunition, AmmunitionActions.deleteAmmunition({ id: 'x' }))).toEqual(
      AmmunitionActions.deleteAmmunitionSuccess({ id: 'x' }),
    );
    expect(await run(deleteAmmunition, AmmunitionActions.deleteAmmunition({ id: 'x' }))).toEqual(
      AmmunitionActions.deleteAmmunitionFailure({ id: 'x', error: 'Error: boom' }),
    );
  });
});
