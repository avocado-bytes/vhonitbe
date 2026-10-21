import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import { HandloadingState, initialState } from '../state/handloading/handloading.reducer';
import { Handloading } from './handloading';

describe('Handloading', () => {
  let fixture: ComponentFixture<Handloading>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const element = () => fixture.nativeElement as HTMLElement;
  const dialog = () => element().querySelector('dialog.form-dialog') as HTMLDialogElement;
  const setState = async (handloading: Partial<HandloadingState>) => {
    store.setState({ handloading: { ...initialState, ...handloading } });
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
      providers: [provideTranslateService({ lang: 'en' }), provideMockStore({ initialState: { handloading: initialState } })],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      HANDLOADING: {
        TITLE: 'Handloading',
        SERIES: 'Load development',
        ADD: 'Start load development',
        EMPTY: 'No load development yet',
        FORM: { ADD_TITLE: 'New load development' },
      },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(Handloading);
    await fixture.whenStable();
  });

  it('should load the series and explain an empty list', () => {
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.load());
    expect(element().querySelector('h1')?.textContent).toContain('Handloading');
    expect(element().querySelector('#load-series-list')?.textContent).toContain('Load development');
    expect(element().textContent).toContain('No load development yet');
  });

  it('should list each series by its caliber, styled like the other lists', async () => {
    await setState({
      series: [
        { id: 'a', caliber: '.308 Win' },
        { id: 'b', caliber: '.243 Win' },
      ],
    });

    const items = Array.from(element().querySelectorAll('li.load-series'));
    expect(items.map((item) => item.textContent?.trim())).toEqual(['.243 Win', '.308 Win']);
    expect(items[0].classList).toContain('bg-body-tertiary');
  });

  it('should start a series with its own add button, opening the form', async () => {
    const fab = element().querySelector('button.fab') as HTMLButtonElement;
    expect(fab.getAttribute('aria-label')).toBe('Start load development');

    fab.click();
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.startAdd());

    await setState({ formOpen: true });
    await fixture.whenStable();
    expect(dialog().open).toBe(true);
    expect(dialog().querySelector('#load-series-form-title')?.textContent).toContain('New load development');
    expect(dialog().querySelector('app-load-series-form')).not.toBeNull();
  });

  it('should cancel the form when the dialog is closed, and close once saved', async () => {
    await setState({ formOpen: true });
    await fixture.whenStable();

    (dialog().querySelector('.btn-close') as HTMLButtonElement).click();
    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.closeForm());

    await setState({ formOpen: true });
    await fixture.whenStable();
    dispatch.mockClear();
    await setState({ formOpen: false });
    expect(dialog().open).toBe(false);
    expect(dispatch).not.toHaveBeenCalledWith(HandloadingActions.closeForm());
  });
});
