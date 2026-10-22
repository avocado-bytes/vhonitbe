import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { HuntingEvent } from '../model/event';
import { EventsActions } from '../state/events/events.actions';
import { EventsState, initialState } from '../state/events/events.reducer';
import { initialState as locationState } from '../state/location/location.reducer';
import { initialState as weatherState } from '../state/weather/weather.reducer';
import { Overview } from './overview';

describe('Overview', () => {
  let fixture: ComponentFixture<Overview>;
  let store: MockStore;

  const event = (id: string, overrides: Partial<HuntingEvent> = {}): HuntingEvent => ({
    id,
    type: 'spotting',
    animal: 'roe-deer',
    location: { latitude: 49, longitude: 13.5 },
    note: '',
    occurredAt: '2026-10-01T06:30:00.000Z',
    createdAt: '2026-10-01T06:31:00.000Z',
    updatedAt: '2026-10-01T06:31:00.000Z',
    ...overrides,
  });

  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent ?? '';
  const button = (label: string) =>
    Array.from(element().querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement;

  const storeState = {
    events: initialState,
    settings: { theme: 'light', language: 'en' },
    location: locationState,
    weather: weatherState,
  };

  async function setState(events: Partial<EventsState>) {
    store.setState({ ...storeState, events: { ...initialState, ...events } });
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Overview],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({ initialState: storeState }),
      ],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('en', {
      OVERVIEW: {
        LOADING: 'Loading events…',
        EMPTY: 'No events yet.',
        LOAD_FAILED: 'Load failed',
        PREVIOUS: 'Previous',
        NEXT: 'Next',
        PAGE: 'Page {{page}} of {{pages}}',
        EDIT: 'Edit event',
        DELETE: 'Delete event',
        DELETE_CONFIRM: 'Delete this event?',
        DELETE_FAILED: 'Delete failed',
        HERD: 'Herd',
        HERD_OF: 'Herd of {{count}}',
        TAG_NUMBER: 'Tag number',
        FIREARM: 'Firearm: {{value}}',
        AMMUNITION: 'Ammunition: {{value}}',
      },
      SEXES: { male: 'Male', female: 'Female', mixed: 'Mixed' },
      ITEMS: { spotting: 'Sighting', harvest: 'Harvest' },
      ANIMALS: { 'roe-deer': 'Roe deer' },
    });
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(Overview);
    await fixture.whenStable();
  });

  it('should show a loading message while the first page loads', async () => {
    await setState({ loading: true });
    expect(element().querySelector('[aria-labelledby="dashboard-events"] [role="status"]')?.textContent).toContain(
      'Loading events…',
    );
  });

  it('should show an empty state when there are no events', async () => {
    await setState({ total: 0 });
    expect(text()).toContain('No events yet.');
  });

  it('should show an error when loading failed', async () => {
    await setState({ loadError: 'boom' });
    expect(element().querySelector('[role="alert"]')?.textContent).toContain('Load failed');
  });

  it('should list the events of the current page', async () => {
    await setState({
      events: [event('a', { type: 'harvest', note: 'Clean shot' }), event('b', { animal: null, location: null })],
      total: 2,
    });

    const items = Array.from(element().querySelectorAll('li.event'));
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Harvest');
    expect(items[0].textContent).toContain('Roe deer');
    expect(items[0].textContent).toContain('49.00000, 13.50000');
    // The note is left for the full view
    expect(items[0].textContent).not.toContain('Clean shot');
    expect(items[0].querySelector('time')?.getAttribute('datetime')).toBe('2026-10-01T06:30:00.000Z');
    expect(items[0].querySelector('time')?.textContent?.trim()).toBe(
      new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date('2026-10-01T06:30:00.000Z')),
    );
    expect(items[1].textContent).not.toContain('Roe deer');
  });

  it('should leave the firearm and ammunition of a harvest for its full view', async () => {
    await setState({
      events: [
        event('a', {
          type: 'harvest',
          firearm: { name: 'Blaser R8', caliber: '.308 Win', optics: 'none' },
          ammunition: {
            caliber: '.308 Win',
            source: 'factory',
            bulletWeight: 165,
            muzzleVelocity: 820,
            bulletType: 'Soft point (SP)',
            ballisticCoefficient: null,
            primer: '',
            powder: '',
            brass: '',
            brassFirings: null,
          },
        }),
      ],
      total: 1,
    });

    expect(element().querySelector('li.event')?.textContent).not.toContain('Blaser R8');
    expect(element().querySelector('li.event')?.textContent).not.toContain('Soft point');
  });

  it('should show an event in full when it is tapped, but not when one of its actions is', async () => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    await setState({ events: [event('a', { type: 'harvest', note: 'Clean shot' })], total: 1 });
    const viewDialog = () => element().querySelector('dialog[aria-labelledby="event-view-title"]') as HTMLDialogElement;
    const item = element().querySelector('li.event') as HTMLElement;

    (item.querySelector('button[aria-label="Edit event"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(viewDialog().querySelector('app-event-view')).toBeNull();

    (item.querySelector('.event-details') as HTMLElement | null)?.click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(viewDialog().open).toBe(true));
    expect(viewDialog().querySelector('#event-view-title')?.textContent).toContain('Harvest');
    expect(viewDialog().querySelector('app-event-view')?.textContent).toContain('Clean shot');
  });

  it('should open the full view from the keyboard, with the item\'s title button', async () => {
    await setState({ events: [event('a', { type: 'harvest' })], total: 1 });

    const open = element().querySelector('li.event button.item-open') as HTMLButtonElement;
    expect(open.getAttribute('aria-haspopup')).toBe('dialog');
    open.click();
    await fixture.whenStable();

    expect(element().querySelector('dialog[aria-labelledby="event-view-title"] app-event-view')).not.toBeNull();
  });

  it('should show the animal, sex and herd of an event on one line', async () => {
    await setState({
      events: [
        event('a', { sex: 'mixed', herd: true, herdSize: 7 }),
        event('b', { sex: 'female' }),
        event('c', { herd: true, herdSize: null }),
        event('d', { animal: null }),
      ],
      total: 4,
    });

    const details = Array.from(element().querySelectorAll('.event')).map((item) => {
      const line = item.querySelector('.event-details');
      return line ? Array.from(line.querySelectorAll('span')).map((part) => part.textContent?.trim()) : null;
    });
    expect(details).toEqual([['Roe deer', 'Mixed', 'Herd of 7'], ['Roe deer', 'Female'], ['Roe deer', 'Herd'], null]);
  });

  it('should show the tag number with a space between its sections', async () => {
    await setState({ events: [event('a', { type: 'harvest', tagNumber: '12345678' }), event('b')], total: 2 });

    const items = element().querySelectorAll('.event');
    expect(items[0].textContent).toContain('Tag number 12 345678');
    expect(items[1].textContent).not.toContain('Tag number');
  });

  it('should hide the pagination when everything fits on one page', async () => {
    await setState({ events: [event('a')], total: 1 });
    expect(element().querySelector('nav')).toBeNull();
  });

  describe('pagination', () => {
    let dispatch: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      dispatch = vi.spyOn(store, 'dispatch');
    });

    it('should show the current page and disable Previous on the first page', async () => {
      await setState({ events: [event('a')], total: 25, pageIndex: 0 });

      expect(element().querySelector('nav')?.textContent).toContain('Page 1 of 3');
      expect(button('Previous').disabled).toBe(true);
      expect(button('Next').disabled).toBe(false);
    });

    it('should disable Next on the last page', async () => {
      await setState({ events: [event('a')], total: 25, pageIndex: 2 });

      expect(element().querySelector('nav')?.textContent).toContain('Page 3 of 3');
      expect(button('Next').disabled).toBe(true);
    });

    it('should load the next and previous pages', async () => {
      await setState({ events: [event('a')], total: 25, pageIndex: 1 });

      button('Next').click();
      expect(dispatch).toHaveBeenCalledWith(EventsActions.loadPage({ pageIndex: 2 }));

      button('Previous').click();
      expect(dispatch).toHaveBeenCalledWith(EventsActions.loadPage({ pageIndex: 0 }));
    });

    it('should disable paging while a page is loading', async () => {
      await setState({ events: [event('a')], total: 25, pageIndex: 1, loading: true });

      expect(button('Previous').disabled).toBe(true);
      expect(button('Next').disabled).toBe(true);
    });
  });

  describe('delete', () => {
    let dispatch: ReturnType<typeof vi.spyOn>;
    let confirm: ReturnType<typeof vi.spyOn>;
    const deleteButton = (index = 0) =>
      element().querySelectorAll<HTMLButtonElement>('li.event button[aria-label="Delete event"]')[index];

    beforeEach(async () => {
      dispatch = vi.spyOn(store, 'dispatch');
      confirm = vi.spyOn(window, 'confirm');
      await setState({ events: [event('a'), event('b')], total: 2 });
    });

    afterEach(() => confirm.mockRestore());

    it('should show a delete button for every event', () => {
      expect(deleteButton(0)).toBeTruthy();
      expect(deleteButton(1)).toBeTruthy();
    });

    it('should delete the event after confirmation', () => {
      confirm.mockReturnValue(true);

      deleteButton(1).click();

      expect(confirm).toHaveBeenCalledWith('Delete this event?');
      expect(dispatch).toHaveBeenCalledWith(EventsActions.deleteEvent({ id: 'b' }));
    });

    it('should not delete the event when the confirmation is cancelled', () => {
      confirm.mockReturnValue(false);

      deleteButton(0).click();

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('should disable the button while the event is being deleted', async () => {
      await setState({ events: [event('a'), event('b')], total: 2, deleting: ['a'] });

      expect(deleteButton(0).disabled).toBe(true);
      expect(deleteButton(1).disabled).toBe(false);
    });

    it('should show an error when deleting failed', async () => {
      await setState({ events: [event('a')], total: 1, deleteError: 'boom' });

      expect(element().querySelector('[role="alert"]')?.textContent).toContain('Delete failed');
    });
  });

  describe('edit', () => {
    it('should start editing the event when its edit button is clicked', async () => {
      const dispatch = vi.spyOn(store, 'dispatch');
      const second = event('b');
      await setState({ events: [event('a'), second], total: 2 });

      element().querySelectorAll<HTMLButtonElement>('li.event button[aria-label="Edit event"]')[1].click();

      expect(dispatch).toHaveBeenCalledWith(EventsActions.startEdit({ event: second }));
    });
  });
});
