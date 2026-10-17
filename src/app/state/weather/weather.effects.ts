import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, filter, interval, map, of, switchMap, take, takeUntil } from 'rxjs';
import { Coordinates } from '../location/location.model';
import { selectPosition } from '../location/location.reducer';
import { WeatherActions } from './weather.actions';

/** Free weather service (no API key, CORS enabled) */
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

/** Open-Meteo updates the current conditions every 15 minutes */
const REFRESH_INTERVAL = 15 * 60 * 1000;

interface OpenMeteoResponse {
  current: { temperature_2m: number; weather_code: number; is_day: number; wind_speed_10m: number; wind_direction_10m: number };
}

/** Loads the current weather at the user's position, once it is known */
export const load = createEffect(
  (actions$ = inject(Actions), store = inject(Store), http = inject(HttpClient)) =>
    actions$.pipe(
      ofType(WeatherActions.load),
      switchMap(() =>
        store.select(selectPosition).pipe(
          filter((position): position is Coordinates => position !== null),
          take(1),
          switchMap(({ latitude, longitude }) =>
            http
              .get<OpenMeteoResponse>(WEATHER_URL, {
                params: {
                  latitude,
                  longitude,
                  current: 'temperature_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m',
                  wind_speed_unit: 'ms',
                },
              })
              .pipe(
                map(({ current }) =>
                  WeatherActions.loadSuccess({
                    current: {
                      temperature: current.temperature_2m,
                      weatherCode: current.weather_code,
                      isDay: current.is_day === 1,
                      windSpeed: current.wind_speed_10m,
                      windDirection: current.wind_direction_10m,
                    },
                  }),
                ),
                catchError((error: unknown) => of(WeatherActions.loadFailure({ error: String(error) }))),
              ),
          ),
        ),
      ),
    ),
  { functional: true },
);

/** Reloads the weather regularly until refreshing stops, e.g. while the map is open */
export const refresh = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(WeatherActions.startRefresh),
      switchMap(() =>
        interval(REFRESH_INTERVAL).pipe(
          map(() => WeatherActions.load()),
          takeUntil(actions$.pipe(ofType(WeatherActions.stopRefresh))),
        ),
      ),
    ),
  { functional: true },
);
