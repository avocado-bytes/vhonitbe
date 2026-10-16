import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { routes } from './app.routes';
import { MapView } from './map/map';
import { Overview } from './overview/overview';
import { initialState as locationInitialState } from './state/location/location.reducer';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideTranslateService(),
        provideMockStore({ initialState: { location: locationInitialState } }),
      ],
    });
  });

  it('should display the overview on the root url', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/', Overview);

    expect(component).toBeInstanceOf(Overview);
  });

  it('should display the map on the /map url', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/map', MapView);

    expect(component).toBeInstanceOf(MapView);
  });

  it('should redirect unknown urls to the root url', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/does/not/exist', Overview);

    expect(component).toBeInstanceOf(Overview);
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
