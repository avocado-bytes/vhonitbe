import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { LocationActions } from '../state/location/location.actions';
import { LocationState } from '../state/location/location.model';
import { initialState } from '../state/location/location.reducer';
import { MapView } from './map';

describe('MapView', () => {
  let fixture: ComponentFixture<MapView>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapView],
      providers: [provideTranslateService({ lang: 'en' }), provideMockStore({ initialState: { location: initialState } })],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('en', {
      MAP: { LOCATING: 'Finding your location…', ERRORS: { denied: 'Location access was denied.' } },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(MapView);
    await fixture.whenStable();
  });

  const element = () => fixture.nativeElement as HTMLElement;
  async function setLocation(location: LocationState) {
    store.setState({ location });
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
});
