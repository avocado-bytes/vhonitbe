import { GeoPoint } from '../model/event';
import { offset } from './geo';

/** Mapzen / Tilezen terrain tiles hosted on AWS Open Data (free, no API key, CORS enabled) */
export const ELEVATION_TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const ELEVATION_ATTRIBUTION =
  'Elevation: <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Mapzen Terrain Tiles</a>';

/** ~25 m per pixel in central Europe, close to the resolution of the underlying data */
const ZOOM = 12;
const TILE_SIZE = 256;

/** Terrain heights in meters for the area covered by the loaded tiles */
export class ElevationModel {
  constructor(private readonly tiles: ReadonlyMap<string, Float32Array>) {}

  /** Height in meters at the given point, interpolated between the surrounding tile pixels */
  heightAt(point: GeoPoint): number {
    const { x, y } = worldPixel(point);
    // Pixel values describe pixel centers
    const left = Math.floor(x - 0.5);
    const top = Math.floor(y - 0.5);
    const fx = x - 0.5 - left;
    const fy = y - 0.5 - top;
    return (
      this.pixel(left, top) * (1 - fx) * (1 - fy) +
      this.pixel(left + 1, top) * fx * (1 - fy) +
      this.pixel(left, top + 1) * (1 - fx) * fy +
      this.pixel(left + 1, top + 1) * fx * fy
    );
  }

  private pixel(x: number, y: number): number {
    const tile = this.tiles.get(tileKey(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)));
    if (!tile) {
      throw new Error(`No elevation data loaded at pixel ${x}, ${y}`);
    }
    return tile[(y % TILE_SIZE) * TILE_SIZE + (x % TILE_SIZE)];
  }
}

/** Loads the elevation tiles covering `radius` meters around `center` */
export async function loadElevation(center: GeoPoint, radius: number): Promise<ElevationModel> {
  // One extra pixel on every side, so interpolation at the edge has its neighbors
  const north = worldPixel(offset(center, radius, 0));
  const east = worldPixel(offset(center, radius, Math.PI / 2));
  const south = worldPixel(offset(center, radius, Math.PI));
  const west = worldPixel(offset(center, radius, (3 * Math.PI) / 2));
  const minX = Math.floor((west.x - 1) / TILE_SIZE);
  const maxX = Math.floor((east.x + 1) / TILE_SIZE);
  const minY = Math.floor((north.y - 1) / TILE_SIZE);
  const maxY = Math.floor((south.y + 1) / TILE_SIZE);

  const requests: Promise<[string, Float32Array]>[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      requests.push(loadTile(x, y).then((heights) => [tileKey(x, y), heights]));
    }
  }
  return new ElevationModel(new Map(await Promise.all(requests)));
}

async function loadTile(x: number, y: number): Promise<Float32Array> {
  const url = ELEVATION_TILE_URL.replace('{z}', String(ZOOM)).replace('{x}', String(x)).replace('{y}', String(y));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Elevation tile ${url} failed with ${response.status}`);
  }
  // The colors encode heights, so they must reach the canvas unchanged
  const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  // An offscreen canvas also works inside a web worker
  const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas is not supported');
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const { data } = context.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
  const heights = new Float32Array(TILE_SIZE * TILE_SIZE);
  for (let i = 0; i < heights.length; i++) {
    // Terrarium encoding
    heights[i] = data[i * 4] * 256 + data[i * 4 + 1] + data[i * 4 + 2] / 256 - 32768;
  }
  return heights;
}

/** Web Mercator pixel coordinates at the elevation zoom level */
function worldPixel({ latitude, longitude }: GeoPoint): { x: number; y: number } {
  const size = TILE_SIZE * 2 ** ZOOM;
  const phi = (latitude * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * size,
    y: ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * size,
  };
}

function tileKey(x: number, y: number): string {
  return `${x}/${y}`;
}
