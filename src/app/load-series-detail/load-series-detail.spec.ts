import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { LoadSeries, TestLoad } from '../model/load-series';
import { initialState as firearmsInitialState } from '../state/firearms/firearms.reducer';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import { HandloadingState, initialState } from '../state/handloading/handloading.reducer';
import { LoadSeriesDetail } from './load-series-detail';

describe('LoadSeriesDetail', () => {
  let fixture: ComponentFixture<LoadSeriesDetail>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const load = (id: string, overrides: Partial<TestLoad> = {}): TestLoad => ({
    id,
    powderCharge: 44,
    overallLength: 71.1,
    shots: 3,
    groupSize: 18,
    velocities: [812, 818, 815],
    notes: '',
    promotedAt: null,
    ...overrides,
  });
  const series: LoadSeries = {
    id: 's1',
    caliber: '.308 Win',
    name: 'Varget 168 SMK',
    bulletType: 'Sierra MatchKing',
    bulletWeight: 168,
    powder: 'Hodgdon Varget',
    caseLength: 51,
    firearm: { name: 'Blaser R8', caliber: '.308 Win', optics: 'none' },
    loads: [load('l2', { powderCharge: 44.5, notes: 'Flattened primers' }), load('l1')],
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const loads = () => Array.from(element().querySelectorAll('li.test-load'));
  const setState = async (handloading: Partial<HandloadingState>) => {
    store.setState({
      handloading: { ...initialState, ...handloading },
      firearms: firearmsInitialState,
      settings: { theme: 'light', language: 'en' },
    });
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadSeriesDetail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 's1' })) } },
        provideTranslateService({ lang: 'en' }),
        provideMockStore({
          initialState: {
            handloading: { ...initialState, series: [series] },
            firearms: firearmsInitialState,
            settings: { theme: 'light', language: 'en' },
          },
        }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      FIREARMS: { FORM: { CALIBER: 'Caliber' } },
      AMMUNITION: { FORM: { POWDER: 'Powder' } },
      HANDLOADING: {
        TITLE: 'Handloading',
        BULLET: 'Bullet',
        NOT_FOUND: 'Not found',
        ADD_LOAD: 'Add test load',
        EDIT: 'Edit series',
        EDIT_LOAD: 'Edit test load',
        DELETE_LOAD: 'Delete test load',
        DELETE_LOAD_CONFIRM: 'Delete this test load?',
        PROMOTE: 'Add to ammunition',
        PROMOTE_CONFIRM: 'Add to ammunition?',
        PROMOTED: 'In ammunition since {{date}}',
        PROMOTE_NEEDS: { velocity: 'Needs a velocity' },
        OAL: 'OAL {{value}} mm',
        SHOTS: 'Shots: {{count}}',
        GROUP: 'group {{value}} mm',
        AVERAGE: 'average {{value}} m/s',
        EXTREME_SPREAD: 'ES {{value}} m/s',
        STANDARD_DEVIATION: 'SD {{value}} m/s',
        FORM: { CASE_LENGTH: 'Case length', FIREARM: 'Tested in' },
      },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(LoadSeriesDetail);
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should load the series and show its name and the details that were given', () => {
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.load());
    expect(element().querySelector('h1')?.textContent).toContain('Varget 168 SMK');
    const details = Array.from(element().querySelectorAll('dl dt')).map((dt) => `${dt.textContent?.trim()}: ${dt.nextElementSibling?.textContent?.trim()}`);
    expect(details).toEqual([
      'Caliber: .308 Win',
      'Bullet: Sierra MatchKing 168 gr',
      'Powder: Hodgdon Varget',
      'Case length: 51 mm',
      'Tested in: Blaser R8 (.308 Win)',
    ]);
  });

  it('should list the test loads by charge with their group, velocity statistics and notes', () => {
    // The dots between the parts of a line are added by the stylesheet
    const lines = (item: Element) =>
      Array.from(item.querySelectorAll('.load-title, .load-details')).map((line) =>
        Array.from(line.querySelectorAll(':scope > span')).map((span) => span.textContent?.trim()),
      );

    expect(lines(loads()[0])).toEqual([
      ['44 gr', 'OAL 71.1 mm'],
      ['Shots: 3', 'group 18 mm'],
      ['average 815 m/s', 'ES 6 m/s', 'SD 3 m/s'],
    ]);
    expect(lines(loads()[1])[0]).toEqual(['44.5 gr', 'OAL 71.1 mm']);
    expect(loads()[1].textContent).toContain('Flattened primers');
  });

  it('should add and edit test loads with the series\' forms', () => {
    (element().querySelector('button.fab') as HTMLButtonElement).click();
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.startAddLoad({ seriesId: 's1' }));

    (loads()[0].querySelector('button[aria-label="Edit test load"]') as HTMLButtonElement).click();
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.startEditLoad({ seriesId: 's1', load: load('l1') }));

    (Array.from(element().querySelectorAll('button')).find((button) => button.textContent?.includes('Edit series')) as HTMLButtonElement).click();
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.startEdit({ series }));
  });

  it('should delete a test load from its series once confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    (loads()[0].querySelector('button[aria-label="Delete test load"]') as HTMLButtonElement).click();

    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.updateSeries({ series: { ...series, loads: [series.loads![0]] } }));
  });

  it('should add a test load to the ammunition once confirmed', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const promote = loads()[0].querySelector('button[aria-label="Add to ammunition"]') as HTMLButtonElement;

    promote.click();
    expect(dispatch).not.toHaveBeenCalledWith(HandloadingActions.promoteLoad({ series, loadId: 'l1' }));

    promote.click();
    expect(confirm).toHaveBeenCalledWith('Add to ammunition?');
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.promoteLoad({ series, loadId: 'l1' }));
  });

  it('should not offer adding a load without a velocity, saying why on phones', async () => {
    await setState({ series: [{ ...series, loads: [load('l1', { velocities: [] })] }] });

    expect((loads()[0].querySelector('button[aria-label="Add to ammunition"]') as HTMLButtonElement).disabled).toBe(true);
    (loads()[0].querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    const item = element().querySelector('#load-actions-l1 [role="menuitem"]') as HTMLButtonElement;
    expect(item.disabled).toBe(true);
    expect(item.textContent).toContain('Needs a velocity');
  });

  it('should mark a load added to the ammunition instead of offering it again', async () => {
    await setState({ series: [{ ...series, loads: [load('l1', { promotedAt: '2026-10-21T10:00:00.000Z' })] }] });

    expect(loads()[0].querySelector('button[aria-label="Add to ammunition"]')).toBeNull();
    expect(loads()[0].querySelector('.promoted-badge')?.textContent).toContain('In ammunition since');
  });

  it('should say so when the series does not exist', async () => {
    await setState({ series: [] });

    expect(element().textContent).toContain('Not found');
    expect(element().querySelector('button.fab')).toBeNull();
  });
});
