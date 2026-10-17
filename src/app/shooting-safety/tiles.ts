import { GeoPoint } from '../model/event';
import { offset } from './geo';

/** ~25 m per pixel and ~6 km per tile in central Europe */
export const TILE_ZOOM = 12;
export const TILE_SIZE = 256;

export interface Tile {
  x: number;
  y: number;
}

/** Web Mercator pixel coordinates at the tile zoom level */
export function worldPixel({ latitude, longitude }: GeoPoint): { x: number; y: number } {
  const size = TILE_SIZE * 2 ** TILE_ZOOM;
  const phi = (latitude * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * size,
    y: ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * size,
  };
}

/** The tiles covering `radius` meters around `center`, with one extra pixel on every side */
export function coveringTiles(center: GeoPoint, radius: number): Tile[] {
  const north = worldPixel(offset(center, radius, 0));
  const east = worldPixel(offset(center, radius, Math.PI / 2));
  const south = worldPixel(offset(center, radius, Math.PI));
  const west = worldPixel(offset(center, radius, (3 * Math.PI) / 2));
  const tiles: Tile[] = [];
  for (let x = Math.floor((west.x - 1) / TILE_SIZE); x <= Math.floor((east.x + 1) / TILE_SIZE); x++) {
    for (let y = Math.floor((north.y - 1) / TILE_SIZE); y <= Math.floor((south.y + 1) / TILE_SIZE); y++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

/** The area covered by a tile, in degrees */
export function tileBounds({ x, y }: Tile): { south: number; west: number; north: number; east: number } {
  const count = 2 ** TILE_ZOOM;
  const longitude = (tileX: number) => (tileX / count) * 360 - 180;
  const latitude = (tileY: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / count))) * 180) / Math.PI;
  return { south: latitude(y + 1), west: longitude(x), north: latitude(y), east: longitude(x + 1) };
}
