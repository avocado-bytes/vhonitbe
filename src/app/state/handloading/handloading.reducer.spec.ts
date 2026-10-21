import { Ammunition } from '../../model/ammunition';
import { LoadSeries, TestLoad } from '../../model/load-series';
import { HandloadingActions } from './handloading.actions';
import { handloadingFeature, HandloadingState, initialState, selectLoadSeries, selectSorted } from './handloading.reducer';

describe('handloading reducer', () => {
  const { reducer } = handloadingFeature;
  const load: TestLoad = { id: 'l1', powderCharge: 44.5, overallLength: null, shots: null, groupSize: null, velocities: [], notes: '' };
  const series = (id: string, caliber: string, name = ''): LoadSeries => ({ id, caliber, name, loads: [load] });

  it('should mark loading and store the loaded series or the failure', () => {
    const loading = reducer({ ...initialState, loadError: 'old' }, HandloadingActions.load());
    expect(loading).toEqual({ ...initialState, loading: true });

    expect(reducer(loading, HandloadingActions.loadSuccess({ series: [series('a', '.308 Win')] }))).toEqual({
      ...initialState,
      series: [series('a', '.308 Win')],
    });
    expect(reducer(loading, HandloadingActions.loadFailure({ error: 'boom' }))).toEqual({ ...initialState, loadError: 'boom' });
  });

  it('should open the form for a new series, a series to edit, a new test load or a test load to edit', () => {
    const failed = { ...initialState, saveError: 'old' };

    expect(reducer(failed, HandloadingActions.startAdd())).toEqual({ ...initialState, form: 'series' });
    expect(reducer(failed, HandloadingActions.startEdit({ series: series('a', '.308 Win') }))).toEqual({
      ...initialState,
      form: 'series',
      editingSeries: series('a', '.308 Win'),
    });
    expect(reducer(failed, HandloadingActions.startAddLoad({ seriesId: 'a' }))).toEqual({ ...initialState, form: 'load', loadSeriesId: 'a' });
    expect(reducer(failed, HandloadingActions.startEditLoad({ seriesId: 'a', load }))).toEqual({
      ...initialState,
      form: 'load',
      loadSeriesId: 'a',
      editingLoad: load,
    });
  });

  it('should close the form when cancelled or once saved, keeping it open with an error', () => {
    const open: HandloadingState = { ...initialState, series: [series('a', '.308 Win')], form: 'load', loadSeriesId: 'a', editingLoad: load };
    expect(reducer(open, HandloadingActions.closeForm())).toEqual({ ...initialState, series: open.series });

    const saving = reducer(open, HandloadingActions.updateSeries({ series: series('a', '.308 Win', 'Varget') }));
    expect(saving.saving).toBe(true);
    expect(reducer(saving, HandloadingActions.updateSeriesSuccess({ series: series('a', '.308 Win', 'Varget') }))).toEqual({
      ...initialState,
      series: [series('a', '.308 Win', 'Varget')],
    });
    expect(reducer(saving, HandloadingActions.updateSeriesFailure({ error: 'boom' }))).toEqual({ ...open, saveError: 'boom' });
  });

  it('should add a saved series', () => {
    const saving = reducer({ ...initialState, form: 'series' }, HandloadingActions.addSeries({ series: { caliber: '.308 Win' } }));

    expect(reducer(saving, HandloadingActions.addSeriesSuccess({ series: series('a', '.308 Win') }))).toEqual({
      ...initialState,
      series: [series('a', '.308 Win')],
    });
  });

  it('should track deleting and remove a deleted series', () => {
    const state = { ...initialState, series: [series('a', '.308 Win')] };
    const deleting = reducer(state, HandloadingActions.deleteSeries({ id: 'a' }));
    expect(deleting.deleting).toEqual(['a']);

    expect(reducer(deleting, HandloadingActions.deleteSeriesSuccess({ id: 'a' }))).toEqual(initialState);
    expect(reducer(deleting, HandloadingActions.deleteSeriesFailure({ id: 'a', error: 'boom' }))).toEqual({ ...state, deleteError: 'boom' });
  });

  it('should track promoting and store the series with the load marked as added', () => {
    const state = { ...initialState, series: [series('a', '.308 Win')] };
    const promoting = reducer(state, HandloadingActions.promoteLoad({ series: series('a', '.308 Win'), loadId: 'l1' }));
    expect(promoting.promoting).toEqual(['l1']);

    const promoted = { ...series('a', '.308 Win'), loads: [{ ...load, promotedAt: '2026-10-21T10:00:00.000Z' }] };
    expect(reducer(promoting, HandloadingActions.promoteLoadSuccess({ series: promoted, ammunition: {} as Ammunition }))).toEqual({
      ...state,
      series: [promoted],
    });
    expect(reducer(promoting, HandloadingActions.promoteLoadFailure({ loadId: 'l1', error: 'boom' }))).toEqual({
      ...state,
      promoteError: 'boom',
    });
  });

  it('should order the series by caliber, then by name, and find the series of the load in the form', () => {
    const all = [series('a', '.308 Win', 'Varget'), series('b', '.243 Win'), series('c', '.308 Win', 'N140')];
    const root = (state: Partial<HandloadingState>) => ({ handloading: { ...initialState, series: all, ...state } });

    expect(selectSorted(root({})).map((s) => s.id)).toEqual(['b', 'c', 'a']);
    expect(selectLoadSeries(root({ loadSeriesId: 'c' }))?.id).toBe('c');
    expect(selectLoadSeries(root({}))).toBeNull();
  });
});
