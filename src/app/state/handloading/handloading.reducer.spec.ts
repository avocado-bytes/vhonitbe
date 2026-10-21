import { HandloadingActions } from './handloading.actions';
import { handloadingFeature, initialState, selectSorted } from './handloading.reducer';

describe('handloading reducer', () => {
  const { reducer } = handloadingFeature;

  it('should mark loading and store the loaded series or the failure', () => {
    const loading = reducer({ ...initialState, loadError: 'old' }, HandloadingActions.load());
    expect(loading).toEqual({ ...initialState, loading: true });

    const series = [{ id: 'a', caliber: '.308 Win' }];
    expect(reducer(loading, HandloadingActions.loadSuccess({ series }))).toEqual({ ...initialState, series });
    expect(reducer(loading, HandloadingActions.loadFailure({ error: 'boom' }))).toEqual({ ...initialState, loadError: 'boom' });
  });

  it('should open the form, clearing an old error, and close it', () => {
    const open = reducer({ ...initialState, saveError: 'old' }, HandloadingActions.startAdd());
    expect(open).toEqual({ ...initialState, formOpen: true });
    expect(reducer(open, HandloadingActions.closeForm())).toEqual(initialState);
  });

  it('should add a saved series and close the form, or keep it open with the error', () => {
    const saving = reducer({ ...initialState, formOpen: true }, HandloadingActions.addSeries({ series: { caliber: '.308 Win' } }));
    expect(saving.saving).toBe(true);

    expect(reducer(saving, HandloadingActions.addSeriesSuccess({ series: { id: 'a', caliber: '.308 Win' } }))).toEqual({
      ...initialState,
      series: [{ id: 'a', caliber: '.308 Win' }],
    });
    expect(reducer(saving, HandloadingActions.addSeriesFailure({ error: 'boom' }))).toEqual({
      ...initialState,
      formOpen: true,
      saveError: 'boom',
    });
  });

  it('should order the series by caliber', () => {
    const series = [
      { id: 'a', caliber: '.308 Win' },
      { id: 'b', caliber: '.243 Win' },
      { id: 'c', caliber: '6.5 Creedmoor' },
    ];

    expect(selectSorted({ handloading: { ...initialState, series } }).map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });
});
