import { GeoPoint } from '../model/event';
import { BuildingCache } from './building-cache';
import { coveringTiles, Tile, TILE_ZOOM, tileBounds } from './tiles';

/** Free OpenStreetMap query service (CORS enabled); fair use only, so every tile is cached */
export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/** Buildings rarely change, so a stored tile is used for this long before it is loaded again, in milliseconds */
const REFRESH_AGE = 30 * 24 * 60 * 60 * 1000;

/** Waits this long before the single retry when the service is busy, in milliseconds */
const RETRY_DELAY = 2000;

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Places a bullet must not reach, from OpenStreetMap */
export interface Hazards {
  /** The extent of every building */
  buildings: Bounds[];
}

interface OverpassElement {
  type: string;
  id: number;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
}

/**
 * Loads the buildings covering `radius` meters around `center`. Tiles are stored locally; a stored
 * tile older than `REFRESH_AGE` is still used right away and loaded again in the background.
 */
export async function loadHazards(center: GeoPoint, radius: number, cache = new BuildingCache()): Promise<Hazards> {
  const buildings: Bounds[] = [];
  const stale: Tile[] = [];
  // One tile after another; the service only allows a few parallel requests per user
  for (const tile of coveringTiles(center, radius)) {
    const cached = await cache.get(tileKey(tile));
    if (cached) {
      buildings.push(...cached.buildings);
      if (Date.now() - cached.loadedAt > REFRESH_AGE) {
        stale.push(tile);
      }
    } else {
      buildings.push(...(await refreshTile(tile, cache)));
    }
  }

  // Not awaited; a refresh cut short by the worker ending is simply repeated next time
  void (async () => {
    for (const tile of stale) {
      await refreshTile(tile, cache).catch(() => undefined);
    }
  })();

  // Buildings crossing tile edges are listed in every tile they touch; duplicates don't change the zones
  return { buildings };
}

/** Loads a tile from the service and stores it */
async function refreshTile(tile: Tile, cache: BuildingCache): Promise<Bounds[]> {
  const buildings: Bounds[] = [];
  for (const { bounds } of await loadTile(tile)) {
    if (bounds) {
      buildings.push({ south: bounds.minlat, west: bounds.minlon, north: bounds.maxlat, east: bounds.maxlon });
    }
  }
  await cache.put({ key: tileKey(tile), buildings, loadedAt: Date.now() });
  return buildings;
}

function tileKey({ x, y }: Tile): string {
  return `${TILE_ZOOM}/${x}/${y}`;
}

/** One query per tile, so the stored tiles line up with the elevation tiles */
async function loadTile(tile: Tile): Promise<OverpassElement[]> {
  const { south, west, north, east } = tileBounds(tile);
  const bbox = [south, west, north, east].map((value) => value.toFixed(6)).join(',');
  // Buildings only need their extent
  const query = `[out:json][timeout:60][bbox:${bbox}];(way[building];relation[building];);out ids bb qt;`;
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`;

  let response = await fetch(url);
  if (response.status === 429 || response.status === 504) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    response = await fetch(url);
  }
  if (!response.ok) {
    throw new Error(`Building data failed with ${response.status}`);
  }
  return ((await response.json()) as { elements: OverpassElement[] }).elements;
}

/**
 * A square grid of `cell` meter cells centered on `origin`, marking the cells within a distance of
 * buildings. Cell (0, 0) is the north-west corner.
 */
export class DangerZones {
  readonly size: number;
  readonly building: Uint8Array;

  constructor(
    hazards: Hazards,
    private readonly origin: GeoPoint,
    /** Distance from the center to the grid's edge, in meters */
    halfExtent: number,
    private readonly cell: number,
    buildingDistance: number,
  ) {
    this.size = 2 * Math.ceil(halfExtent / cell);

    const buildings = new Uint8Array(this.size * this.size);
    for (const { south, west, north, east } of hazards.buildings) {
      const [left, bottom] = this.toCell({ latitude: south, longitude: west });
      const [right, top] = this.toCell({ latitude: north, longitude: east });
      for (let y = Math.max(0, top); y <= Math.min(this.size - 1, bottom); y++) {
        for (let x = Math.max(0, left); x <= Math.min(this.size - 1, right); x++) {
          buildings[y * this.size + x] = 1;
        }
      }
    }

    this.building = within(buildings, this.size, buildingDistance / cell);
  }

  /** The cell `dx` meters east and `dy` meters north of the center, or -1 outside the grid */
  index(dx: number, dy: number): number {
    const x = Math.floor(dx / this.cell + this.size / 2);
    const y = Math.floor(this.size / 2 - dy / this.cell);
    return x < 0 || y < 0 || x >= this.size || y >= this.size ? -1 : y * this.size + x;
  }

  private toCell(point: GeoPoint): [number, number] {
    const [dx, dy] = toMeters(this.origin, point);
    return [Math.floor(dx / this.cell + this.size / 2), Math.floor(this.size / 2 - dy / this.cell)];
  }
}

/** Meters east and north of `origin`; the same flat approximation as `offset` */
function toMeters(origin: GeoPoint, point: GeoPoint): [number, number] {
  const EARTH_RADIUS = 6_371_000;
  const latitude = (origin.latitude * Math.PI) / 180;
  return [
    (((point.longitude - origin.longitude) * Math.PI) / 180) * EARTH_RADIUS * Math.cos(latitude),
    (((point.latitude - origin.latitude) * Math.PI) / 180) * EARTH_RADIUS,
  ];
}

/** Marks the cells within `distance` cells of a marked cell, using an exact euclidean distance transform */
function within(marked: Uint8Array, size: number, distance: number): Uint8Array {
  const squared = new Float64Array(size * size);
  for (let i = 0; i < squared.length; i++) {
    squared[i] = marked[i] ? 0 : Infinity;
  }

  const line = new Float64Array(size);
  const result = new Float64Array(size);
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) line[y] = squared[y * size + x];
    transform1d(line, result);
    for (let y = 0; y < size; y++) squared[y * size + x] = result[y];
  }
  for (let y = 0; y < size; y++) {
    line.set(squared.subarray(y * size, (y + 1) * size));
    transform1d(line, result);
    squared.set(result, y * size);
  }

  const zone = new Uint8Array(size * size);
  const limit = distance * distance;
  for (let i = 0; i < zone.length; i++) {
    zone[i] = squared[i] <= limit ? 1 : 0;
  }
  return zone;
}

/** Felzenszwalb & Huttenlocher's squared distance transform of a sampled function */
function transform1d(f: Float64Array, d: Float64Array): void {
  const n = f.length;
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  let k = -1;
  for (let q = 0; q < n; q++) {
    if (f[q] === Infinity) {
      continue;
    }
    let s = 0;
    while (k >= 0 && (s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])) <= z[k]) {
      k--;
    }
    k++;
    v[k] = q;
    z[k] = k === 0 ? -Infinity : s;
    z[k + 1] = Infinity;
  }
  for (let q = 0, j = 0; q < n; q++) {
    if (k < 0) {
      d[q] = Infinity;
      continue;
    }
    while (z[j + 1] < q) {
      j++;
    }
    d[q] = (q - v[j]) * (q - v[j]) + f[v[j]];
  }
}
