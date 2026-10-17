import { LocationActions } from './location.actions';
import { initialState, locationFeature } from './location.reducer';

describe('location reducer', () => {
  const { reducer } = locationFeature;
  const position = { latitude: 50.08, longitude: 14.42, accuracy: 20 };

  it('should start locating', () => {
    const state = reducer({ ...initialState, error: 'timeout', status: 'error' }, LocationActions.locate());
    expect(state).toEqual({ status: 'locating', position: null, error: null, manual: false });
  });

  it('should store the position when located', () => {
    const state = reducer({ ...initialState, status: 'locating' }, LocationActions.located({ position }));
    expect(state).toEqual({ status: 'located', position, error: null, manual: false });
  });

  it('should keep the last known position when locating fails', () => {
    const state = reducer(
      { status: 'locating', position, error: null, manual: false },
      LocationActions.locateFailed({ error: 'denied' }),
    );
    expect(state).toEqual({ status: 'error', position, error: 'denied', manual: false });
  });
});
