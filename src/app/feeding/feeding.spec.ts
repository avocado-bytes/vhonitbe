import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { HuntingEvent } from '../model/event';
import { initialState as eventsInitialState } from '../state/events/events.reducer';
import { FeedingActions } from '../state/feeding/feeding.actions';
import { FeedingState, initialState } from '../state/feeding/feeding.reducer';
import { Feeding } from './feeding';

describe('Feeding', () => {
  let fixture: ComponentFixture<Feeding>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const event = (id: string, overrides: Partial<HuntingEvent> = {}): HuntingEvent => ({
    id,
    type: 'feeding',
    animal: null,
    location: null,
    note: '',
    occurredAt: '2026-10-01T06:30:00.000Z',
    createdAt: '2026-10-01T06:31:00.000Z',
    updatedAt: '2026-10-01T06:31:00.000Z',
    ...overrides,
  });
  const element = () => fixture.nativeElement as HTMLElement;
  const setState = async (feeding: Partial<FeedingState>) => {
    store.setState({
      feeding: { ...initialState, ...feeding },
      events: eventsInitialState,
      settings: { theme: 'light', language: 'en' },
    });
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Feeding],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({
          initialState: { feeding: initialState, events: eventsInitialState, settings: { theme: 'light', language: 'en' } },
        }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      FEEDING: { NO_PLACES: 'No places', EMPTY: 'No feeding events', ALL_ITEMS: 'All' },
      ITEMS: { feeding: 'Feeding', 'salt-lick': 'Salt lick' },
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
    await setState({ events: [] });

    expect(element().textContent).toContain('No places');
    expect(element().textContent).toContain('No feeding events');
    expect(element().querySelector('app-feeding-map')).toBeNull();
  });

  it('should show the map only for places with a location and list all events', async () => {
    await setState({ events: [event('a', { location: { latitude: 49, longitude: 13.5 } }), event('b', { type: 'salt-lick' })] });

    expect(element().querySelector('app-feeding-map')).not.toBeNull();
    expect(element().querySelectorAll('app-event-list .event')).toHaveLength(2);
  });

  it('should offer only the feeding items in the filter', () => {
    const options = Array.from((element().querySelector('#feeding-item') as HTMLSelectElement).options);

    expect(options.map((option) => option.value)).toEqual(['', 'feeding', 'salt-lick']);
  });

  it('should filter the list by the selected item', () => {
    const select = element().querySelector('#feeding-item') as HTMLSelectElement;
    select.value = 'salt-lick';
    select.dispatchEvent(new Event('change'));

    expect(dispatch).toHaveBeenCalledWith(FeedingActions.setItem({ item: 'salt-lick' }));
  });
});
