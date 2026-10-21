import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { LoadSeries } from '../model/load-series';
import { initialState as firearmsInitialState } from '../state/firearms/firearms.reducer';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import { HandloadingState, initialState } from '../state/handloading/handloading.reducer';
import { Handloading } from './handloading';

describe('Handloading', () => {
  let fixture: ComponentFixture<Handloading>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const series: LoadSeries = {
    id: 's1',
    caliber: '.308 Win',
    name: 'Varget 168 SMK',
    startedAt: '2026-10-01',
    bulletType: 'Sierra MatchKing',
    bulletWeight: 168,
    powder: 'Hodgdon Varget',
    loads: [
      { id: 'l1', powderCharge: 44, overallLength: null, shots: null, groupSize: null, velocities: [], notes: '' },
      { id: 'l2', powderCharge: 44.5, overallLength: null, shots: null, groupSize: null, velocities: [], notes: '' },
    ],
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const dialog = () => element().querySelector('dialog.form-dialog') as HTMLDialogElement;
  const setState = async (handloading: Partial<HandloadingState>) => {
    store.setState({
      handloading: { ...initialState, ...handloading },
      firearms: firearmsInitialState,
      settings: { theme: 'light', language: 'en' },
    });
    await fixture.whenStable();
  };

  // jsdom does not implement HTMLDialogElement.showModal()/close()
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Handloading],
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'en' }),
        provideMockStore({
          initialState: { handloading: initialState, firearms: firearmsInitialState, settings: { theme: 'light', language: 'en' } },
        }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      HANDLOADING: {
        TITLE: 'Handloading',
        SERIES: 'Load development',
        ADD: 'Start load development',
        EMPTY: 'No load development yet',
        EDIT: 'Edit series',
        DELETE: 'Delete series',
        DELETE_CONFIRM: 'Delete this series?',
        LOAD_COUNT: 'Test loads: {{count}}',
        FORM: { ADD_TITLE: 'New load development', EDIT_TITLE: 'Edit load development' },
      },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(Handloading);
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should load the series and explain an empty list', () => {
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.load());
    expect(element().textContent).toContain('No load development yet');
  });

  it('should list each series with its name, components, start and number of test loads, linking to its page', async () => {
    await setState({ series: [series, { id: 's2', caliber: '.243 Win' }] });

    const items = Array.from(element().querySelectorAll('li.load-series'));
    expect(items.map((item) => item.querySelector('a')?.getAttribute('href'))).toEqual(['/handloading/s2', '/handloading/s1']);
    expect(items[1].querySelector('.fw-semibold')?.textContent?.trim()).toBe('Varget 168 SMK');
    // The dots between the details are added by the stylesheet
    expect(Array.from(items[1].querySelectorAll('.series-details > span')).map((span) => span.textContent?.trim())).toEqual([
      '.308 Win',
      'Sierra MatchKing 168 gr',
      'Hodgdon Varget',
      new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(2026, 9, 1)),
    ]);
    expect(items[1].textContent).toContain('Test loads: 2');
    expect(items[0].querySelector('.fw-semibold')?.textContent?.trim()).toBe('.243 Win');
    expect(items[0].textContent).toContain('Test loads: 0');
  });

  it('should start a series with its own add button, opening the form', async () => {
    (element().querySelector('button.fab') as HTMLButtonElement).click();
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.startAdd());

    await setState({ form: 'series' });
    await fixture.whenStable();
    expect(dialog().open).toBe(true);
    expect(dialog().querySelector('#handloading-form-title')?.textContent).toContain('New load development');
    expect(dialog().querySelector('app-load-series-form')).not.toBeNull();
  });

  it('should edit a series from its actions, in the same form', async () => {
    await setState({ series: [series] });
    (element().querySelector('li.load-series button[aria-label="Edit series"]') as HTMLButtonElement).click();
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.startEdit({ series }));

    await setState({ series: [series], form: 'series', editingSeries: series });
    await fixture.whenStable();
    expect(dialog().querySelector('#handloading-form-title')?.textContent).toContain('Edit load development');
  });

  it('should delete a series from the phone menu only once confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await setState({ series: [series] });
    const deleteFromMenu = async () => {
      (element().querySelector('li.load-series button[aria-haspopup="menu"]') as HTMLButtonElement).click();
      await fixture.whenStable();
      (element().querySelectorAll<HTMLButtonElement>('#series-actions-s1 [role="menuitem"]')[1]).click();
      await fixture.whenStable();
    };

    await deleteFromMenu();
    expect(dispatch).not.toHaveBeenCalledWith(HandloadingActions.deleteSeries({ id: 's1' }));

    await deleteFromMenu();
    expect(confirm).toHaveBeenCalledWith('Delete this series?');
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.deleteSeries({ id: 's1' }));
  });

  it('should cancel the form when the dialog is closed', async () => {
    await setState({ form: 'series' });
    await fixture.whenStable();

    (dialog().querySelector('.btn-close') as HTMLButtonElement).click();

    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.closeForm());
  });
});
