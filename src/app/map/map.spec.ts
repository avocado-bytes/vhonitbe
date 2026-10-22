import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import * as L from 'leaflet';
import { HuntingEvent } from '../model/event';
import { HuntingGround } from '../model/hunting-ground';
import { initialState as huntingGroundInitialState } from '../state/hunting-ground/hunting-ground.reducer';
import { EventsActions } from '../state/events/events.actions';
import { initialState as eventsInitialState } from '../state/events/events.reducer';
import { LocationActions } from '../state/location/location.actions';
import { LocationState } from '../state/location/location.model';
import { MapOptionsActions } from '../state/map-options/map-options.actions';
import { initialState as mapOptionsInitialState, MapOptionsState } from '../state/map-options/map-options.reducer';
import { initialState } from '../state/location/location.reducer';
import { MapView } from './map';

describe('MapView', () => {
  let fixture: ComponentFixture<MapView>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapView],
      providers: [provideTranslateService({ lang: 'en' }), provideMockStore({
          initialState: { location: initialState, events: eventsInitialState, settings: { theme: 'light', language: 'en' } },
        }),],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('en', {
      MAP: { LOCATING: 'Finding your location…', ERRORS: { denied: 'Location access was denied.' } },
      ITEMS: { harvest: 'Harvest', tracks: 'Tracks', poaching: 'Poaching' },
      ANIMALS: { 'wild-boar': 'Wild boar' },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(MapView);
    await fixture.whenStable();
  });

  const element = () => fixture.nativeElement as HTMLElement;
  let latest: HuntingEvent[] = [];
  /** A position from the device, not one set by hand */
  async function setLocation(location: Omit<LocationState, 'manual'>) {
    store.setState({
      location: { ...location, manual: false },
      events: { ...eventsInitialState, latest },
      settings: { theme: 'light', language: 'en' },
    });
    await fixture.whenStable();
  }

  it('should request the current location when created', () => {
    expect(dispatch).toHaveBeenCalledWith(LocationActions.locate());
  });

  it('should not render the map while the location is not known', async () => {
    expect(element().querySelector('.map')).toBeNull();

    await setLocation({ status: 'locating', position: null, error: null });
    expect(element().querySelector('.map')).toBeNull();

    await setLocation({ status: 'error', position: null, error: 'denied' });
    expect(element().querySelector('.map')).toBeNull();
  });

  it('should render an OpenTopoMap map once the location is known', async () => {
    await setLocation({ status: 'located', position: { latitude: 50.08, longitude: 14.42, accuracy: 20 }, error: null });
    expect(element().querySelector('.map.leaflet-container')).not.toBeNull();
    expect(element().querySelector('.leaflet-control-attribution')?.textContent).toContain('OpenTopoMap');
  });

  it('should show a status while locating', async () => {
    await setLocation({ status: 'locating', position: null, error: null });
    expect(element().querySelector('[role="status"]')?.textContent).toContain('Finding your location…');
  });

  it('should show the error when locating fails', async () => {
    await setLocation({ status: 'error', position: null, error: 'denied' });
    expect(element().querySelector('[role="alert"]')?.textContent).toContain('Location access was denied.');
  });

  it('should mark the current location on the map', async () => {
    await setLocation({ status: 'located', position: { latitude: 50.08, longitude: 14.42, accuracy: 20 }, error: null });
    expect(element().querySelectorAll('path.leaflet-interactive').length).toBe(2);
    expect(element().querySelector('.map-status')).toBeNull();
  });

  describe('event markers', () => {
    const located: Omit<LocationState, 'manual'> = {
      status: 'located',
      position: { latitude: 50.08, longitude: 14.42, accuracy: 20 },
      error: null,
    };
    const event = (id: string, overrides: Partial<HuntingEvent> = {}): HuntingEvent => ({
      id,
      type: 'harvest',
      animal: 'wild-boar',
      location: { latitude: 50.09, longitude: 14.43 },
      note: '<img src=x onerror=alert(1)>',
      occurredAt: '2026-10-01T06:30:00.000Z',
      createdAt: '2026-10-01T06:31:00.000Z',
      updatedAt: '2026-10-01T06:31:00.000Z',
      ...overrides,
    });
    const markers = () => Array.from(element().querySelectorAll<HTMLElement>('.leaflet-marker-icon.event-marker'));

    afterEach(() => (latest = []));

    it('should load the latest events when created', () => {
      expect(dispatch).toHaveBeenCalledWith(EventsActions.loadLatest());
    });

    it('should show a marker for every latest event with a location', async () => {
      latest = [event('a'), event('b', { type: 'tracks', location: { latitude: 50.1, longitude: 14.4 } }), event('c', { location: null })];

      await setLocation(located);

      expect(markers()).toHaveLength(2);
      expect(markers().map((marker) => marker.title)).toEqual(['Harvest', 'Tracks']);
    });

    it('should show the event type, animal and date in the popup', async () => {
      latest = [event('a')];
      await setLocation(located);

      markers()[0].click();

      const popup = element().querySelector('.leaflet-popup-content') as HTMLElement;
      expect(popup.textContent).toContain('Harvest');
      expect(popup.textContent).toContain('Wild boar');
      expect(popup.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-01T06:30:00.000Z');
      expect(popup.querySelector('time')?.textContent).toBe(
        new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date('2026-10-01T06:30:00.000Z')),
      );
      expect(popup.querySelector('img')).toBeNull();
    });

    it('should leave the animal out of the popup when there is none', async () => {
      latest = [event('a', { type: 'poaching', animal: null })];
      await setLocation(located);

      markers()[0].click();

      const lines = element().querySelectorAll('.leaflet-popup-content .event-popup > *');
      expect(Array.from(lines).map((line) => line.tagName)).toEqual(['DIV', 'TIME']);
    });

    it('should update the markers when the latest events change', async () => {
      latest = [event('a')];
      await setLocation(located);
      expect(markers()).toHaveLength(1);

      latest = [];
      await setLocation(located);

      expect(markers()).toHaveLength(0);
    });
  });

  describe('menu', () => {
    const located: LocationState = {
      status: 'located',
      position: { latitude: 50.08, longitude: 14.42, accuracy: 20 },
      error: null,
      manual: false,
    };
    const map = () => (fixture.componentInstance as unknown as { map: () => L.Map }).map();
    const menu = () => element().querySelector('app-map-menu');
    const fire = async (type: 'click' | 'contextmenu') => {
      map().fire(type, { latlng: L.latLng(50.09, 14.43), containerPoint: L.point(120, 300), originalEvent: new MouseEvent(type) });
      await fixture.whenStable();
    };
    const setState = async (mapOptions: Partial<MapOptionsState> = {}) => {
      store.setState({
        location: located,
        events: eventsInitialState,
        mapOptions: { ...mapOptionsInitialState, ...mapOptions },
        settings: { theme: 'light', language: 'en' },
      });
      await fixture.whenStable();
    };
    /** A phone: a touch screen below the breakpoint where the panel collapses */
    const onPhone = () =>
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) => ({ matches: true, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }) as unknown as MediaQueryList,
      );

    beforeEach(() => {
      // jsdom has no matchMedia; the map then behaves as on a desktop
      window.matchMedia ??= ((query: string) => ({ matches: false, media: query }) as MediaQueryList) as typeof window.matchMedia;
    });
    afterEach(() => vi.restoreAllMocks());

    it('should open on a right click, or a long press, which Leaflet reports the same way', async () => {
      await setState();

      await fire('contextmenu');

      expect(menu()).not.toBeNull();
    });

    it('should not open on a plain tap on a phone', async () => {
      onPhone();
      await setState();

      await fire('click');

      expect(menu()).toBeNull();
    });

    it('should only close the open panel on a tap on a phone, without opening the menu', async () => {
      onPhone();
      await setState({ panelOpen: true });
      dispatch.mockClear();

      await fire('click');

      expect(dispatch).toHaveBeenCalledWith(MapOptionsActions.setPanelOpen({ open: false }));
      expect(menu()).toBeNull();
    });
  });

  describe('hunting ground', () => {
    const ground: HuntingGround = {
      code: 'CZ2120404111',
      name: 'BRDY',
      area: 25665,
      outline: [[[
        { latitude: 50.07, longitude: 14.41 },
        { latitude: 50.07, longitude: 14.43 },
        { latitude: 50.09, longitude: 14.43 },
        { latitude: 50.09, longitude: 14.41 },
      ]]],
      searchedAt: { latitude: 50.08, longitude: 14.42 },
      fetchedAt: '2026-10-01T10:00:00.000Z',
    };
    const setState = async (enabled: boolean, kept: HuntingGround | null) => {
      store.setState({
        location: { status: 'located', position: { latitude: 50.08, longitude: 14.42, accuracy: 20 }, error: null, manual: false },
        events: eventsInitialState,
        mapOptions: { ...mapOptionsInitialState, huntingGround: enabled },
        huntingGround: { ...huntingGroundInitialState, ground: kept },
        settings: { theme: 'light', language: 'en' },
      });
      await fixture.whenStable();
    };
    /** Leaflet draws the boundary with its dashes; the location marks have none */
    const outline = () => element().querySelector('path[stroke-dasharray="10 6"]');

    it('should draw the boundary of the kept hunting ground and name it in the panel', async () => {
      await setState(true, ground);

      expect(outline()).not.toBeNull();
      expect(element().querySelector('.leaflet-control-attribution')?.textContent).toContain('NLI');
      expect(element().querySelector('#map-panel')?.textContent).toContain('BRDY (CZ2120404111)');
    });

    it('should hide the boundary when the option is off', async () => {
      await setState(false, ground);

      expect(outline()).toBeNull();
      expect(element().querySelector('#map-panel')?.textContent).not.toContain('BRDY');
    });

    it('should point to the settings while no hunting ground is kept', async () => {
      await setState(true, null);

      expect(outline()).toBeNull();
      expect(element().querySelector('#map-panel')?.textContent).toContain('MAP.HUNTING_GROUND_NONE');
    });

    it('should turn the boundary on and off with its checkbox', async () => {
      await setState(true, ground);
      dispatch.mockClear();

      (element().querySelector('#hunting-ground') as HTMLInputElement).click();

      expect(dispatch).toHaveBeenCalledWith(MapOptionsActions.setHuntingGround({ enabled: false }));
    });
  });
});
