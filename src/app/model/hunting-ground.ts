import { GeoPoint } from './event';

/**
 * The user's hunting ground with its boundary, taken from the hunting grounds map of the National Forestry Institute (NLI).
 * The boundary is only for orientation; it is not legally binding.
 */
export interface HuntingGround {
  /** The official code of the hunting ground, e.g. CZ2120404111 */
  code: string;
  name: string;
  /** In hectares */
  area: number | null;
  /** Polygons made of rings of points; the first ring of a polygon is its boundary, any further ones are holes in it */
  outline: GeoPoint[][][];
  /** Where the hunting ground was looked up, so its boundary can be downloaded again */
  searchedAt: GeoPoint;
  /** When the boundary was downloaded, as ISO 8601 */
  fetchedAt: string;
}

/** WFS of the NLI with the boundaries of all Czech hunting grounds (CORS enabled, no API key) */
export const HUNTING_GROUNDS_URL = 'https://gp.nli.gov.cz/wfs_uhul/service.svc/get';

export const HUNTING_GROUNDS_ATTRIBUTION = 'Hranice honiteb &copy; <a href="https://nli.gov.cz">NLI</a>';

/** The service only answers in Web Mercator; this is the earth radius it uses, in meters */
const EARTH_RADIUS = 6378137;

/** Half the side of the square looked up around a point, in meters */
const SEARCH_RADIUS = 1;

/**
 * Asks for the hunting grounds at a point.
 * Built by hand, as Angular's HTTP parameters would send the + of the output format unencoded, which reads as a space.
 */
export function huntingGroundsUrl(point: GeoPoint): string {
  const [x, y] = toMercator(point);
  const params: Record<string, string> = {
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'gmgml:mysl_honi',
    OUTPUTFORMAT: 'application/geo+json',
    SRSNAME: 'EPSG:3857',
    BBOX: [x - SEARCH_RADIUS, y - SEARCH_RADIUS, x + SEARCH_RADIUS, y + SEARCH_RADIUS, 'EPSG:3857'].join(','),
  };
  const query = Object.entries(params)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('&');
  return `${HUNTING_GROUNDS_URL}?${query}`;
}

type Ring = [number, number][];

/** The parts of the service's GeoJSON that are used */
export interface HuntingGroundsResponse {
  features?: {
    properties?: { HONITBA?: string; NAZEVHONITBY?: string; VYMERA_SA?: number | null };
    geometry?: { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] } | null;
  }[];
}

/**
 * The hunting grounds found at a point; ones whose square around the point only touches their boundary are left out,
 * unless none actually contains the point.
 * Only the code, name, area and boundary are kept: the service also lists the holders' names and contacts, which the app has no use for.
 */
export function toHuntingGrounds(response: HuntingGroundsResponse, searchedAt: GeoPoint, fetchedAt: Date): HuntingGround[] {
  const grounds = (response.features ?? []).flatMap(({ properties, geometry }) => {
    if (!properties?.HONITBA || !geometry) {
      return [];
    }
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    return [
      {
        code: properties.HONITBA,
        name: properties.NAZEVHONITBY?.trim() || properties.HONITBA,
        area: properties.VYMERA_SA ?? null,
        outline: polygons.map((rings) => rings.map((ring) => ring.map(fromMercator))),
        searchedAt,
        fetchedAt: fetchedAt.toISOString(),
      },
    ];
  });
  const containing = grounds.filter((ground) => contains(ground.outline, searchedAt));
  return containing.length ? containing : grounds;
}

/** Whether a point lies inside the outline, outside its holes */
export function contains(outline: GeoPoint[][][], point: GeoPoint): boolean {
  return outline.some(([boundary, ...holes]) => inRing(boundary, point) && !holes.some((hole) => inRing(hole, point)));
}

/** Ray casting; precise enough at the scale of a hunting ground */
function inRing(ring: GeoPoint[], { latitude, longitude }: GeoPoint): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.latitude > latitude !== b.latitude > latitude) {
      const crossing = ((b.longitude - a.longitude) * (latitude - a.latitude)) / (b.latitude - a.latitude) + a.longitude;
      if (longitude < crossing) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/** ~10 cm; avoids noise like 49.00000000001 from the projection */
const PRECISION = 1e6;

function toMercator({ latitude, longitude }: GeoPoint): [number, number] {
  const x = (EARTH_RADIUS * longitude * Math.PI) / 180;
  const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
  return [x, y];
}

function fromMercator([x, y]: [number, number]): GeoPoint {
  const longitude = (x / EARTH_RADIUS) * (180 / Math.PI);
  const latitude = (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * (180 / Math.PI);
  return { latitude: Math.round(latitude * PRECISION) / PRECISION, longitude: Math.round(longitude * PRECISION) / PRECISION };
}
