import { Ammunition } from '../../model/ammunition';
import { FirearmsActions } from '../firearms/firearms.actions';
import { HandloadingActions } from '../handloading/handloading.actions';
import { AmmunitionActions } from './ammunition.actions';
import { ammunitionFeature, initialState, selectSorted } from './ammunition.reducer';

describe('ammunition reducer', () => {
  const { reducer } = ammunitionFeature;
  const cartridge = (id: string, caliber: string, bulletWeight: number): Ammunition => ({
    id,
    caliber,
    source: 'factory',
    bulletWeight,
    muzzleVelocity: 820,
    bulletType: '',
    ballisticCoefficient: null,
    primer: '',
    powder: '',
    brass: '',
    brassFirings: null,
  });

  it('should mark loading and store the loaded ammunition or the failure', () => {
    const loading = reducer({ ...initialState, loadError: 'old' }, AmmunitionActions.load());
    expect(loading).toEqual({ ...initialState, loading: true });

    const ammunition = [cartridge('a', '.308 Win', 165)];
    expect(reducer(loading, AmmunitionActions.loadSuccess({ ammunition }))).toEqual({ ...initialState, ammunition });
    expect(reducer(loading, AmmunitionActions.loadFailure({ error: 'boom' }))).toEqual({ ...initialState, loadError: 'boom' });
  });

  it('should add saved ammunition or keep the error, which reopening the dialog clears', () => {
    const saving = reducer(initialState, AmmunitionActions.addAmmunition({ ammunition: cartridge('a', '.308 Win', 165) }));
    expect(saving.saving).toBe(true);

    expect(reducer(saving, AmmunitionActions.addAmmunitionSuccess({ ammunition: cartridge('a', '.308 Win', 165) }))).toEqual({
      ...initialState,
      ammunition: [cartridge('a', '.308 Win', 165)],
    });
    const failed = reducer(saving, AmmunitionActions.addAmmunitionFailure({ error: 'boom' }));
    expect(failed).toEqual({ ...initialState, saveError: 'boom' });
    expect(reducer(failed, FirearmsActions.startAdd())).toEqual(initialState);
  });

  it('should order the ammunition by caliber, then by bullet weight', () => {
    const ammunition = [cartridge('a', '.308 Win', 180), cartridge('b', '.243 Win', 100), cartridge('c', '.308 Win', 150)];

    expect(selectSorted({ ammunition: { ...initialState, ammunition } }).map((a) => a.id)).toEqual(['b', 'c', 'a']);
  });

  it('should edit ammunition in the shared dialog and replace it once saved', () => {
    const state = { ...initialState, ammunition: [cartridge('a', '.308 Win', 165), cartridge('b', '.243 Win', 100)] };
    const editing = reducer({ ...state, saveError: 'old' }, AmmunitionActions.startEdit({ ammunition: cartridge('a', '.308 Win', 165) }));
    expect(editing).toEqual({ ...state, editing: cartridge('a', '.308 Win', 165) });

    const heavier = cartridge('a', '.308 Win', 180);
    const saving = reducer(editing, AmmunitionActions.updateAmmunition({ ammunition: heavier }));
    expect(reducer(saving, AmmunitionActions.updateAmmunitionSuccess({ ammunition: heavier }))).toEqual({
      ...state,
      ammunition: [heavier, cartridge('b', '.243 Win', 100)],
    });
    expect(reducer(saving, AmmunitionActions.updateAmmunitionFailure({ error: 'boom' }))).toEqual({ ...editing, saveError: 'boom' });
  });

  it('should stop editing when the dialog closes or is opened for a firearm or for adding', () => {
    const editing = { ...initialState, editing: cartridge('a', '.308 Win', 165) };
    const firearm = { id: 'g', name: 'Blaser R8', caliber: '.308 Win', optics: 'none' as const };

    expect(reducer(editing, FirearmsActions.closeForm())).toEqual(initialState);
    expect(reducer(editing, FirearmsActions.startAdd())).toEqual(initialState);
    expect(reducer(editing, FirearmsActions.startEdit({ firearm }))).toEqual(initialState);
  });

  it('should track deleting and remove deleted ammunition', () => {
    const state = { ...initialState, ammunition: [cartridge('a', '.308 Win', 165)] };
    const deleting = reducer(state, AmmunitionActions.deleteAmmunition({ id: 'a' }));
    expect(deleting.deleting).toEqual(['a']);

    expect(reducer(deleting, AmmunitionActions.deleteAmmunitionSuccess({ id: 'a' }))).toEqual(initialState);
    expect(reducer(deleting, AmmunitionActions.deleteAmmunitionFailure({ id: 'a', error: 'boom' }))).toEqual({
      ...state,
      deleteError: 'boom',
    });
  });

  it('should add a test load added to the ammunition from its load development series', () => {
    const ammunition = cartridge('a', '.308 Win', 168);

    expect(
      reducer(initialState, HandloadingActions.promoteLoadSuccess({ series: { id: 's1', caliber: '.308 Win' }, ammunition })),
    ).toEqual({ ...initialState, ammunition: [ammunition] });
  });
});
