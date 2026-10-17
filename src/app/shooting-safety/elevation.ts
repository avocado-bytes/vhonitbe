import { GeoPoint } from '../model/event';
import { coveringTiles, TILE_SIZE, TILE_ZOOM, worldPixel } from './tiles';

/** Mapzen / Tilezen terrain tiles hosted on AWS Open Data (free, no API key, CORS enabled) */
export const ELEVATION_TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const ELEVATION_ATTRIBUTION =
  'Elevation: <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Mapzen Terrain Tiles</a>';

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
  // The extra pixel around the area lets interpolation at the edge reach its neighbors
  const requests = coveringTiles(center, radius).map(({ x, y }) =>
    loadTile(x, y).then((heights): [string, Float32Array] => [tileKey(x, y), heights]),
  );
  return new ElevationModel(new Map(await Promise.all(requests)));
}

async function loadTile(x: number, y: number): Promise<Float32Array> {
  const url = ELEVATION_TILE_URL.replace('{z}', String(TILE_ZOOM)).replace('{x}', String(x)).replace('{y}', String(y));
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

function tileKey(x: number, y: number): string {
  return `${x}/${y}`;
}
