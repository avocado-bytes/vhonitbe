/**
 * Sun and moon positions after the formulas of Vladimir Agafonkin's SunCalc (BSD-2-Clause),
 * which are based on http://aa.quae.nl/en/reken/hemelpositie.html. Accurate to about a minute,
 * plenty for the times of the day.
 */

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2440588;
const J2000 = 2451545;
/** Obliquity of the earth */
const E = RAD * 23.4397;
/** Altitude of the sun's upper edge at sunrise and sunset, including refraction */
const SUNRISE_ALTITUDE = -0.833 * RAD;
const J0 = 0.0009;

function toDays(date: Date): number {
  return date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
}

function fromJulian(julian: number): Date {
  return new Date((julian + 0.5 - J1970) * DAY_MS);
}

function rightAscension(l: number, b: number): number {
  return Math.atan2(Math.sin(l) * Math.cos(E) - Math.tan(b) * Math.sin(E), Math.cos(l));
}

function declination(l: number, b: number): number {
  return Math.asin(Math.sin(b) * Math.cos(E) + Math.cos(b) * Math.sin(E) * Math.sin(l));
}

function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(m: number): number {
  const center = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
  const perihelion = RAD * 102.9372;
  return m + center + perihelion + Math.PI;
}

function sunCoords(d: number): { dec: number; ra: number } {
  const l = eclipticLongitude(solarMeanAnomaly(d));
  return { dec: declination(l, 0), ra: rightAscension(l, 0) };
}

function moonCoords(d: number): { dec: number; ra: number; dist: number } {
  const l = RAD * (218.316 + 13.176396 * d);
  const m = RAD * (134.963 + 13.064993 * d);
  const f = RAD * (93.272 + 13.22935 * d);
  const longitude = l + RAD * 6.289 * Math.sin(m);
  const latitude = RAD * 5.128 * Math.sin(f);
  return { dec: declination(longitude, latitude), ra: rightAscension(longitude, latitude), dist: 385001 - 20905 * Math.cos(m) };
}

export interface SunTimes {
  /** Null when the sun doesn't rise or set that day (polar day or night) */
  sunrise: Date | null;
  sunset: Date | null;
}

/** Sunrise and sunset of the day containing `date`, best passed as local noon */
export function sunTimes(date: Date, latitude: number, longitude: number): SunTimes {
  const lw = RAD * -longitude;
  const phi = RAD * latitude;
  const n = Math.round(toDays(date) - J0 - lw / (2 * Math.PI));
  const approxTransit = (hourAngle: number) => J0 + (hourAngle + lw) / (2 * Math.PI) + n;
  const transit = (ds: number, m: number, l: number) => J2000 + ds + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * l);

  const ds = approxTransit(0);
  const m = solarMeanAnomaly(ds);
  const l = eclipticLongitude(m);
  const dec = declination(l, 0);
  const noon = transit(ds, m, l);

  const cosHourAngle = (Math.sin(SUNRISE_ALTITUDE) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosHourAngle < -1 || cosHourAngle > 1) {
    return { sunrise: null, sunset: null };
  }
  const set = transit(approxTransit(Math.acos(cosHourAngle)), m, l);
  return { sunrise: fromJulian(noon - (set - noon)), sunset: fromJulian(set) };
}

export interface MoonIllumination {
  /** Illuminated share of the disc, 0 to 1 */
  fraction: number;
  /** 0 new moon, 0.25 first quarter, 0.5 full moon, 0.75 last quarter */
  phase: number;
}

export function moonIllumination(date: Date): MoonIllumination {
  const SUN_DISTANCE = 149598000;
  const d = toDays(date);
  const s = sunCoords(d);
  const m = moonCoords(d);
  const elongation = Math.acos(
    Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra),
  );
  const inclination = Math.atan2(SUN_DISTANCE * Math.sin(elongation), m.dist - SUN_DISTANCE * Math.cos(elongation));
  const angle = Math.atan2(
    Math.cos(s.dec) * Math.sin(s.ra - m.ra),
    Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra),
  );
  return {
    fraction: (1 + Math.cos(inclination)) / 2,
    phase: 0.5 + (0.5 * inclination * (angle < 0 ? -1 : 1)) / Math.PI,
  };
}

export const MOON_PHASES = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
] as const;

export type MoonPhase = (typeof MOON_PHASES)[number];

/** The named phase; quarters and new and full moon cover the day or so around them */
export function moonPhaseName(phase: number): MoonPhase {
  return MOON_PHASES[Math.round(phase * 8) % 8];
}
