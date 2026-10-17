import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { CurrentWeather } from './weather.model';

export const WeatherActions = createActionGroup({
  source: 'Weather',
  events: {
    Load: emptyProps(),
    'Load Success': props<{ current: CurrentWeather }>(),
    'Load Failure': props<{ error: string }>(),
    'Start Refresh': emptyProps(),
    'Stop Refresh': emptyProps(),
  },
});
