import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { firstValueFrom, of } from 'rxjs';
import { LocationActions } from './location.actions';
import { locate } from './location.effects';

describe('location effects', () => {
  function runLocate(geolocation: Partial<Geolocation> | undefined): Promise<Action> {
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => of(LocationActions.locate())),
        { provide: DOCUMENT, useValue: { defaultView: { navigator: { geolocation } } } },
      ],
    });
    return TestBed.runInInjectionContext(() => firstValueFrom(locate()));
  }

  it('should dispatch located with the current position', async () => {
    const geolocation = {
      getCurrentPosition: (success: PositionCallback) =>
        success({ coords: { latitude: 50.08, longitude: 14.42, accuracy: 20 } } as GeolocationPosition),
    };

    expect(await runLocate(geolocation)).toEqual(
      LocationActions.located({ position: { latitude: 50.08, longitude: 14.42, accuracy: 20 } }),
    );
  });

  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
  ] as const)('should map geolocation error code %i to %s', async (code, error) => {
    const geolocation = {
      getCurrentPosition: (_: PositionCallback, failure?: PositionErrorCallback | null) =>
        failure?.({ code } as GeolocationPositionError),
    };

    expect(await runLocate(geolocation)).toEqual(LocationActions.locateFailed({ error }));
  });

  it('should fail with unsupported when geolocation is not available', async () => {
    expect(await runLocate(undefined)).toEqual(LocationActions.locateFailed({ error: 'unsupported' }));
  });
});
