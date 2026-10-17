export interface CurrentWeather {
  /** °C */
  temperature: number;
  /** WMO weather interpretation code */
  weatherCode: number;
  isDay: boolean;
  /** m/s, 10 m above the ground */
  windSpeed: number;
  /** Degrees clockwise from north the wind comes from */
  windDirection: number;
}

export type WeatherStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface WeatherState {
  status: WeatherStatus;
  current: CurrentWeather | null;
  error: string | null;
}

export const WEATHER_CONDITIONS = [
  'clear',
  'partly-cloudy',
  'overcast',
  'fog',
  'drizzle',
  'rain',
  'snow',
  'thunderstorm',
] as const;

export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

/** Groups the WMO codes into a few conditions that fit in one word */
export function weatherCondition(code: number): WeatherCondition {
  if (code <= 1) return 'clear';
  if (code === 2) return 'partly-cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunderstorm';
  return 'rain';
}

export const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export type CompassDirection = (typeof COMPASS_DIRECTIONS)[number];

/** The nearest of the eight compass directions */
export function compassDirection(degrees: number): CompassDirection {
  return COMPASS_DIRECTIONS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}
