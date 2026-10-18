import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { FeedingPlace } from '../model/feeding-place';
import { FeedingActions } from '../state/feeding/feeding.actions';
import { FeedingState, initialState } from '../state/feeding/feeding.reducer';
import { initialState as locationInitialState } from '../state/location/location.reducer';
import { Feeding } from './feeding';

describe('Feeding', () => {
  let fixture: ComponentFixture<Feeding>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const place = (id: string, overrides: Partial<FeedingPlace> = {}): FeedingPlace => ({
    id,
    type: 'feeding',
    location: null,
    note: '',
    photoId: null,
    ...overrides,
  });
  const element = () => fixture.nativeElement as HTMLElement;
  const dialog = () => element().querySelector('dialog.form-dialog') as HTMLDialogElement;
  const setState = async (feeding: Partial<FeedingState>) => {
    store.setState({
      feeding: { ...initialState, ...feeding },
      location: locationInitialState,
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
      imports: [Feeding],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({
          initialState: { feeding: initialState, location: locationInitialState, settings: { theme: 'light', language: 'en' } },
        }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      FEEDING: {
        NO_PLACES: 'No places',
        EMPTY: 'No feeders or salt licks',
        ALL_ITEMS: 'All',
        ADD: 'Add feeder or salt lick',
        TYPES: { feeding: 'Feeding', 'salt-lick': 'Salt lick' },
        FORM: { ADD_TITLE: 'Add feeding place', EDIT_TITLE: 'Edit feeding place' },
        IN_SEASON: 'In season',
        OUT_OF_SEASON: 'Out of season',
      },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(Feeding);
    await fixture.whenStable();
  });

  it('should load the feeding places when opened', () => {
    expect(dispatch).toHaveBeenCalledWith(FeedingActions.load());
  });

  it('should explain an empty map and list', async () => {
    await setState({ places: [] });

    expect(element().textContent).toContain('No places');
    expect(element().textContent).toContain('No feeders or salt licks');
    expect(element().querySelector('app-feeding-map')).toBeNull();
  });

  it('should show the map only for places with a location and list all places', async () => {
    await setState({ places: [place('a', { location: { latitude: 49, longitude: 13.5 } }), place('b', { type: 'salt-lick' })] });

    expect(element().querySelector('app-feeding-map')).not.toBeNull();
    expect(element().querySelectorAll('app-feeding-place-list .place')).toHaveLength(2);
  });

  it('should offer the place types in the filter and no sorting by date', () => {
    const options = Array.from((element().querySelector('#feeding-type') as HTMLSelectElement).options);

    expect(options.map((option) => option.value)).toEqual(['', 'feeding', 'feed-pile', 'bait-site', 'salt-lick']);
    expect(element().querySelector('#feeding-sort')).toBeNull();
  });

  it('should filter the list by the selected type', () => {
    const select = element().querySelector('#feeding-type') as HTMLSelectElement;
    select.value = 'salt-lick';
    select.dispatchEvent(new Event('change'));

    expect(dispatch).toHaveBeenCalledWith(FeedingActions.setType({ placeType: 'salt-lick' }));
  });

  it('should start adding a place with its own add button', () => {
    const fab = element().querySelector('button.fab') as HTMLButtonElement;
    expect(fab.getAttribute('aria-label')).toBe('Add feeder or salt lick');

    fab.click();

    expect(dispatch).toHaveBeenCalledWith(FeedingActions.startAdd());
  });

  it('should open the form dialog for adding and for editing', async () => {
    expect(dialog().open).toBe(false);

    await setState({ formOpen: true });
    await fixture.whenStable();
    expect(dialog().open).toBe(true);
    expect(dialog().querySelector('app-feeding-place-form')).not.toBeNull();
    expect(dialog().querySelector('#feeding-form-title')?.textContent).toContain('Add feeding place');

    await setState({ formOpen: true, editing: place('a') });
    expect(dialog().querySelector('#feeding-form-title')?.textContent).toContain('Edit feeding place');
  });

  it('should cancel the form when the dialog is closed, and close the dialog once saved', async () => {
    await setState({ formOpen: true });
    await fixture.whenStable();

    (dialog().querySelector('.btn-close') as HTMLButtonElement).click();
    expect(dispatch).toHaveBeenCalledWith(FeedingActions.closeForm());

    await setState({ formOpen: true });
    await fixture.whenStable();
    dispatch.mockClear();
    await setState({ formOpen: false });

    expect(dialog().open).toBe(false);
    expect(dispatch).not.toHaveBeenCalledWith(FeedingActions.closeForm());
  });

  describe('tiles', () => {
    const startSelect = () => element().querySelector('#feeding-season-start') as HTMLSelectElement;
    const endSelect = () => element().querySelector('#feeding-season-end') as HTMLSelectElement;
    const daysInput = () => element().querySelector('#feeding-replenish-days') as HTMLInputElement;
    const enterDays = async (value: string) => {
      daysInput().value = value;
      daysInput().dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };

    afterEach(() => vi.useRealTimers());

    it('should show the season with month names and whether it is in progress', async () => {
      vi.useFakeTimers({ now: new Date(2026, 11, 1), toFake: ['Date'] });
      await setState({ settings: { seasonStart: 10, seasonEnd: 3, replenishDays: 5 } });

      expect(startSelect().selectedOptions[0].textContent?.trim()).toBe('October');
      expect(endSelect().selectedOptions[0].textContent?.trim()).toBe('March');
      expect(element().querySelector('.badge')?.textContent).toContain('In season');

      vi.setSystemTime(new Date(2026, 5, 1));
      await setState({ settings: { seasonStart: 10, seasonEnd: 3, replenishDays: 6 } });
      expect(element().querySelector('.badge')?.textContent).toContain('Out of season');
    });

    it('should change the start and end of the season', () => {
      startSelect().value = '11';
      startSelect().dispatchEvent(new Event('change'));
      endSelect().value = '2';
      endSelect().dispatchEvent(new Event('change'));

      expect(dispatch).toHaveBeenCalledWith(FeedingActions.setSeason({ seasonStart: 11, seasonEnd: 3 }));
      expect(dispatch).toHaveBeenCalledWith(FeedingActions.setSeason({ seasonStart: 10, seasonEnd: 2 }));
    });

    it('should show the interval and store only a valid number of days', async () => {
      expect(daysInput().value).toBe('5');

      await enterDays('7');
      expect(dispatch).toHaveBeenCalledWith(FeedingActions.setReplenishDays({ replenishDays: 7 }));

      dispatch.mockClear();
      for (const invalid of ['0', '2.5', '', '61']) {
        await enterDays(invalid);
        expect(daysInput().classList).toContain('is-invalid');
      }
      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
