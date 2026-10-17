import { createFeature, createReducer, on } from '@ngrx/store';
import { WeatherActions } from './weather.actions';
import { WeatherState } from './weather.model';

export const initialState: WeatherState = {
  status: 'idle',
  current: null,
  error: null,
};

export const weatherFeature = createFeature({
  name: 'weather',
  reducer: createReducer(
    initialState,
    // The previous weather stays visible while it is refreshed
    on(WeatherActions.load, (state): WeatherState => ({ ...state, status: 'loading', error: null })),
    on(WeatherActions.loadSuccess, (state, { current }): WeatherState => ({ ...state, status: 'loaded', current })),
    on(WeatherActions.loadFailure, (state, { error }): WeatherState => ({ ...state, status: 'error', error })),
  ),
});

export const { selectStatus: selectWeatherStatus, selectCurrent: selectCurrentWeather } = weatherFeature;
