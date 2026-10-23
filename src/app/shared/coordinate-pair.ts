import { GeoPoint } from '../model/event';

/** A coordinate with an optional hemisphere before or after it: "49.72", "49.72N", "N 49.72", "49.72°N" */
const COORDINATE = String.raw`([NSEW])?\s*(-?\d+(?:\.\d+)?)\s*°?\s*([NSEW])?`;
const PAIR = new RegExp(String.raw`^\s*${COORDINATE}\s*[,;\s]\s*${COORDINATE}\s*$`, 'i');
const PRECISION = 1e6;

/**
 * Reads a latitude and longitude copied from a map app, e.g. "49.7215, 13.9512" from Google Maps,
 * "49.7215067N, 13.9512006E" from Mapy.cz or "49,7215, 13,9512" with decimal commas.
 * A hemisphere letter gives the sign (S and W are negative) and may name longitude first; null if the text isn't a position.
 */
export function parseCoordinatePair(text: string): GeoPoint | null {
  // Commas are decimal commas only when the numbers have no decimal points
  const normalized = text.includes('.') ? text : text.replace(/(\d),(\d)/g, '$1.$2');
  const match = PAIR.exec(normalized);
  if (!match) {
    return null;
  }
  const [, firstBefore, first, firstAfter, secondBefore, second, secondAfter] = match;
  const firstHemisphere = (firstBefore ?? firstAfter)?.toUpperCase();
  const secondHemisphere = (secondBefore ?? secondAfter)?.toUpperCase();
  const signed = (value: string, hemisphere: string | undefined) => (hemisphere === 'S' || hemisphere === 'W' ? -1 : 1) * Number(value);

  const longitudeFirst = firstHemisphere === 'E' || firstHemisphere === 'W';
  const latitude = longitudeFirst ? signed(second, secondHemisphere) : signed(first, firstHemisphere);
  const longitude = longitudeFirst ? signed(first, firstHemisphere) : signed(second, secondHemisphere);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  return { latitude: Math.round(latitude * PRECISION) / PRECISION, longitude: Math.round(longitude * PRECISION) / PRECISION };
}
