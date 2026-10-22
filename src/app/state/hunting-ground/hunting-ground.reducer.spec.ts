import { HuntingGround } from '../../model/hunting-ground';
import { HuntingGroundActions } from './hunting-ground.actions';
import { huntingGroundFeature, HuntingGroundState, initialState } from './hunting-ground.reducer';

describe('hunting ground reducer', () => {
  const reduce = huntingGroundFeature.reducer;
  const ground: HuntingGround = {
    code: 'CZ2120404111',
    name: 'BRDY',
    area: 25665,
    outline: [],
    searchedAt: { latitude: 49.72, longitude: 13.95 },
    fetchedAt: '2026-10-22T10:00:00.000Z',
  };

  it('should keep the loaded hunting ground', () => {
    expect(reduce(initialState, HuntingGroundActions.loadSuccess({ ground })).ground).toBe(ground);
  });

  it('should offer the hunting grounds found to choose from, and keep the chosen one', () => {
    let state = reduce({ ...initialState, error: 'service' }, HuntingGroundActions.search());
    expect(state).toEqual({ ...initialState, busy: true });

    state = reduce(state, HuntingGroundActions.searchSuccess({ candidates: [ground] }));
    expect(state).toEqual({ ...initialState, candidates: [ground] });

    state = reduce(state, HuntingGroundActions.choose({ ground }));
    expect(state.busy).toBe(true);

    state = reduce(state, HuntingGroundActions.saveSuccess({ ground }));
    expect(state).toEqual({ ...initialState, ground });
  });

  it('should close the choice when cancelled', () => {
    const state: HuntingGroundState = { ...initialState, candidates: [ground] };

    expect(reduce(state, HuntingGroundActions.cancelSearch())).toEqual(initialState);
  });

  it('should keep the hunting ground when a search or refresh fails', () => {
    const state: HuntingGroundState = { ...initialState, ground, busy: true };

    expect(reduce(state, HuntingGroundActions.searchFailure({ error: 'location' }))).toEqual({ ...initialState, ground, error: 'location' });
    expect(reduce(state, HuntingGroundActions.saveFailure({ error: 'missing' }))).toEqual({ ...initialState, ground, error: 'missing' });
  });

  it('should forget the removed hunting ground', () => {
    expect(reduce({ ...initialState, ground }, HuntingGroundActions.removeSuccess())).toEqual(initialState);
  });
});
