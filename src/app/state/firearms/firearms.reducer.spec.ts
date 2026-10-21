import { Firearm } from '../../model/firearm';
import { AmmunitionActions } from '../ammunition/ammunition.actions';
import { FirearmsActions } from './firearms.actions';
import { firearmsFeature, FirearmsState, initialState, selectSorted } from './firearms.reducer';

describe('firearms reducer', () => {
  const { reducer } = firearmsFeature;
  const firearm = (id: string, name: string): Firearm => ({ id, name, caliber: '.308 Win', optics: 'none' });

  it('should mark loading and store the loaded firearms', () => {
    const loading = reducer({ ...initialState, loadError: 'boom' }, FirearmsActions.load());
    expect(loading).toEqual({ ...initialState, loading: true });

    const firearms = [firearm('a', 'Blaser R8')];
    expect(reducer(loading, FirearmsActions.loadSuccess({ firearms }))).toEqual({ ...initialState, firearms });
    expect(reducer(loading, FirearmsActions.loadFailure({ error: 'boom' }))).toEqual({ ...initialState, loadError: 'boom' });
  });

  it('should open the form, clearing an old error, and close it', () => {
    const open = reducer({ ...initialState, saveError: 'boom' }, FirearmsActions.startAdd());
    expect(open).toEqual({ ...initialState, formOpen: true });
    expect(reducer(open, FirearmsActions.closeForm())).toEqual(initialState);
  });

  it('should open the form for editing and replace the updated firearm once saved', () => {
    const state: FirearmsState = { ...initialState, firearms: [firearm('a', 'Blaser R8'), firearm('b', 'CZ 527')] };
    const editing = reducer({ ...state, saveError: 'boom' }, FirearmsActions.startEdit({ firearm: firearm('a', 'Blaser R8') }));
    expect(editing).toEqual({ ...state, formOpen: true, editing: firearm('a', 'Blaser R8') });

    const renamed = { ...firearm('a', 'Blaser R8 Professional'), suppressed: true };
    const saving = reducer(editing, FirearmsActions.updateFirearm({ firearm: renamed }));
    expect(saving.saving).toBe(true);
    expect(reducer(saving, FirearmsActions.updateFirearmSuccess({ firearm: renamed }))).toEqual({
      ...state,
      firearms: [renamed, firearm('b', 'CZ 527')],
    });
    expect(reducer(saving, FirearmsActions.updateFirearmFailure({ error: 'boom' }))).toEqual({ ...editing, saveError: 'boom' });
  });

  it('should open the form empty for adding after editing', () => {
    const editing = { ...initialState, formOpen: true, editing: firearm('a', 'Blaser R8') };

    expect(reducer(editing, FirearmsActions.closeForm())).toEqual(initialState);
    expect(reducer(editing, FirearmsActions.startAdd())).toEqual({ ...initialState, formOpen: true });
  });

  it('should add a saved firearm and close the form, or keep it open with the error', () => {
    const saving: FirearmsState = { ...initialState, formOpen: true, saving: true };

    expect(reducer(saving, FirearmsActions.addFirearmSuccess({ firearm: firearm('a', 'CZ 557') }))).toEqual({
      ...initialState,
      firearms: [firearm('a', 'CZ 557')],
    });
    expect(reducer(saving, FirearmsActions.addFirearmFailure({ error: 'boom' }))).toEqual({
      ...initialState,
      formOpen: true,
      saveError: 'boom',
    });
  });

  it('should track deleting and remove a deleted firearm', () => {
    const state: FirearmsState = { ...initialState, firearms: [firearm('a', 'Blaser R8'), firearm('b', 'CZ 527')] };
    const deleting = reducer({ ...state, deleteError: 'old' }, FirearmsActions.deleteFirearm({ id: 'a' }));
    expect(deleting).toEqual({ ...state, deleting: ['a'] });

    expect(reducer(deleting, FirearmsActions.deleteFirearmSuccess({ id: 'a' }))).toEqual({
      ...state,
      firearms: [firearm('b', 'CZ 527')],
    });
    expect(reducer(deleting, FirearmsActions.deleteFirearmFailure({ id: 'a', error: 'boom' }))).toEqual({
      ...state,
      deleteError: 'boom',
    });
  });

  it('should close the add dialog once ammunition is saved', () => {
    const open = { ...initialState, formOpen: true };
    const ammunition = { id: 'x', caliber: '.308 Win', source: 'factory' as const, bulletWeight: 165, muzzleVelocity: 820, bulletType: '', ballisticCoefficient: null, primer: '', powder: '', brass: '', brassFirings: null };

    expect(reducer(open, AmmunitionActions.addAmmunitionSuccess({ ammunition }))).toEqual(initialState);
  });

  it('should open the dialog for editing ammunition and close it once saved', () => {
    const ammunition = { id: 'x', caliber: '.308 Win', source: 'factory' as const, bulletWeight: 165, muzzleVelocity: 820, bulletType: '', ballisticCoefficient: null, primer: '', powder: '', brass: '', brassFirings: null };
    const open = reducer({ ...initialState, editing: firearm('a', 'Blaser R8') }, AmmunitionActions.startEdit({ ammunition }));

    expect(open).toEqual({ ...initialState, formOpen: true });
    expect(reducer(open, AmmunitionActions.updateAmmunitionSuccess({ ammunition }))).toEqual(initialState);
  });

  it('should order the firearms by name', () => {
    const firearms = [firearm('a', 'Merkel'), firearm('b', 'Blaser R8'), firearm('c', 'CZ 557')];

    expect(selectSorted({ firearms: { ...initialState, firearms } }).map((f) => f.id)).toEqual(['b', 'c', 'a']);
  });
});
