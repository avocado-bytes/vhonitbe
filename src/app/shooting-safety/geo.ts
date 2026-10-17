import { GeoPoint } from '../model/event';

const EARTH_RADIUS = 6_371_000;

/** The point `distance` meters from `origin` in the direction `azimuth` (radians, clockwise from north) */
export function offset(origin: GeoPoint, distance: number, azimuth: number): GeoPoint {
  const latitude = (origin.latitude * Math.PI) / 180;
  return {
    latitude: origin.latitude + ((distance * Math.cos(azimuth)) / EARTH_RADIUS) * (180 / Math.PI),
    longitude: origin.longitude + ((distance * Math.sin(azimuth)) / (EARTH_RADIUS * Math.cos(latitude))) * (180 / Math.PI),
  };
}

/** Approximate distance in meters; accurate enough for the few kilometers around the user */
export function distance(a: GeoPoint, b: GeoPoint): number {
  const latitude = (((a.latitude + b.latitude) / 2) * Math.PI) / 180;
  const dx = ((b.longitude - a.longitude) * Math.PI * EARTH_RADIUS * Math.cos(latitude)) / 180;
  const dy = ((b.latitude - a.latitude) * Math.PI * EARTH_RADIUS) / 180;
  return Math.hypot(dx, dy);
}

/** How far the ground falls below a level line at `distance` meters, including atmospheric refraction */
export function curvatureDrop(distance: number): number {
  const REFRACTION = 0.13;
  return ((1 - REFRACTION) * distance * distance) / (2 * EARTH_RADIUS);
}
