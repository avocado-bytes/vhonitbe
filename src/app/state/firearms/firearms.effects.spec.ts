import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { firstValueFrom, Observable, Subject } from 'rxjs';
import { Firearm } from '../../model/firearm';
import { FirearmStorage } from '../../storage/firearm-storage';
import { FirearmsActions } from './firearms.actions';
import { addFirearm, deleteFirearm, loadFirearms, updateFirearm } from './firearms.effects';

describe('firearms effects', () => {
  let actions$: Subject<Action>;
  const storage = { getAll: vi.fn(), add: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const firearm: Firearm = { id: 'a', name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope' };

  beforeEach(() => {
    actions$ = new Subject<Action>();
    Object.values(storage).forEach((mock) => mock.mockReset());
    TestBed.configureTestingModule({
      providers: [provideMockActions(() => actions$), { provide: FirearmStorage, useValue: storage }],
    });
  });

  const run = <T>(effect: () => Observable<T>, action: Action) => {
    const result = TestBed.runInInjectionContext(() => firstValueFrom(effect()));
    actions$.next(action);
    return result;
  };

  it('should load the firearms or report a failure', async () => {
    storage.getAll.mockResolvedValueOnce([firearm]).mockRejectedValueOnce(new Error('boom'));

    expect(await run(loadFirearms, FirearmsActions.load())).toEqual(FirearmsActions.loadSuccess({ firearms: [firearm] }));
    expect(await run(loadFirearms, FirearmsActions.load())).toEqual(FirearmsActions.loadFailure({ error: 'Error: boom' }));
  });

  it('should add a firearm or report a failure', async () => {
    storage.add.mockResolvedValueOnce(firearm).mockRejectedValueOnce(new Error('boom'));
    const { id, ...fields } = firearm;

    expect(await run(addFirearm, FirearmsActions.addFirearm({ firearm: fields }))).toEqual(
      FirearmsActions.addFirearmSuccess({ firearm }),
    );
    expect(await run(addFirearm, FirearmsActions.addFirearm({ firearm: fields }))).toEqual(
      FirearmsActions.addFirearmFailure({ error: 'Error: boom' }),
    );
    expect(id).toBe('a');
  });

  it('should update a firearm or report a failure', async () => {
    storage.update.mockResolvedValueOnce(firearm).mockRejectedValueOnce(new Error('boom'));

    expect(await run(updateFirearm, FirearmsActions.updateFirearm({ firearm }))).toEqual(
      FirearmsActions.updateFirearmSuccess({ firearm }),
    );
    expect(await run(updateFirearm, FirearmsActions.updateFirearm({ firearm }))).toEqual(
      FirearmsActions.updateFirearmFailure({ error: 'Error: boom' }),
    );
  });

  it('should delete a firearm or report a failure', async () => {
    storage.delete.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('boom'));

    expect(await run(deleteFirearm, FirearmsActions.deleteFirearm({ id: 'a' }))).toEqual(
      FirearmsActions.deleteFirearmSuccess({ id: 'a' }),
    );
    expect(await run(deleteFirearm, FirearmsActions.deleteFirearm({ id: 'a' }))).toEqual(
      FirearmsActions.deleteFirearmFailure({ id: 'a', error: 'Error: boom' }),
    );
  });
});
