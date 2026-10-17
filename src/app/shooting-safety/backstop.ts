import { GeoPoint } from '../model/event';
import { BackstopOverlay } from '../state/shooting-safety/shooting-safety.model';
import { curvatureDrop, offset } from './geo';

export interface BackstopOptions {
  /** How far around the user the terrain is analyzed, in meters */
  radius: number;
  /** Number of directions analyzed */
  rays: number;
  /** Distance between samples along a direction, in meters */
  step: number;
  /** Height of the muzzle above the ground at the user's position, in meters */
  muzzleHeight: number;
  /** Height of the aimed-at point above the ground, e.g. the chest of the game */
  targetHeight: number;
  /** The terrain must stop the bullet within this distance behind the target, in meters */
  backstopDistance: number;
}

/** A standing shot at game; conservative, as bullet drop is ignored */
export const DEFAULT_BACKSTOP_OPTIONS: BackstopOptions = {
  radius: 3000,
  rays: 720,
  step: 10,
  muzzleHeight: 1.5,
  targetHeight: 0.8,
  backstopDistance: 50,
};

/** The target can't be seen, so it can't be shot at */
export const HIDDEN = 0;
/** The terrain stops a bullet shortly behind the target */
export const BACKSTOP = 1;
/** A bullet passing the target would fly on */
export const NO_BACKSTOP = 2;

export interface BackstopGrid {
  options: BackstopOptions;
  /** Samples per direction; the sample `i` lies `(i + 1) * step` meters away */
  steps: number;
  /** One of HIDDEN, BACKSTOP or NO_BACKSTOP per direction and sample: `cells[ray * steps + i]` */
  cells: Uint8Array;
}

/**
 * Classifies the terrain around `origin` by casting rays outwards. For every sample the shot aims at
 * the target above the ground there; it has a backstop when the ground rises above the continued line
 * of fire within `backstopDistance` behind the target.
 */
export function analyzeBackstop(
  heightAt: (point: GeoPoint) => number,
  origin: GeoPoint,
  options: BackstopOptions = DEFAULT_BACKSTOP_OPTIONS,
): BackstopGrid {
  const { radius, rays, step, muzzleHeight, targetHeight, backstopDistance } = options;
  const steps = Math.floor(radius / step);
  const behind = Math.ceil(backstopDistance / step);
  const muzzle = heightAt(origin) + muzzleHeight;
  const cells = new Uint8Array(rays * steps);
  // ground[i] is the height i * step meters away, lowered by the earth's curvature
  const ground = new Float64Array(steps + behind + 1);

  for (let ray = 0; ray < rays; ray++) {
    const azimuth = (ray / rays) * 2 * Math.PI;
    for (let i = 1; i < ground.length; i++) {
      ground[i] = heightAt(offset(origin, i * step, azimuth)) - curvatureDrop(i * step);
    }

    // The steepest slope of the ground seen so far; anything below it is hidden
    let horizon = -Infinity;
    for (let i = 1; i <= steps; i++) {
      const slope = (ground[i] + targetHeight - muzzle) / (i * step);
      if (slope >= horizon) {
        let stopped = false;
        for (let j = i + 1; j <= i + behind && !stopped; j++) {
          stopped = ground[j] >= muzzle + slope * j * step;
        }
        cells[ray * steps + i - 1] = stopped ? BACKSTOP : NO_BACKSTOP;
      }
      horizon = Math.max(horizon, (ground[i] - muzzle) / (i * step));
    }
  }
  return { options, steps, cells };
}

const COLORS: Record<number, [number, number, number] | undefined> = {
  [BACKSTOP]: [25, 135, 84],
  [NO_BACKSTOP]: [220, 53, 69],
};

/** Draws the grid as a square image centered on `origin`, one pixel per sample step */
export function renderBackstop(grid: BackstopGrid, origin: GeoPoint, document: Document): BackstopOverlay {
  const { radius, rays, step } = grid.options;
  const size = 2 * Math.ceil(radius / step);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not supported');
  }

  const image = context.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = (px + 0.5 - size / 2) * step;
      const dy = (size / 2 - py - 0.5) * step;
      const i = Math.round(Math.hypot(dx, dy) / step);
      if (i < 1 || i > grid.steps) {
        continue;
      }
      const azimuth = (Math.atan2(dx, dy) + 2 * Math.PI) % (2 * Math.PI);
      const ray = Math.round((azimuth / (2 * Math.PI)) * rays) % rays;
      const color = COLORS[grid.cells[ray * grid.steps + i - 1]];
      if (color) {
        const index = (py * size + px) * 4;
        image.data.set([...color, 255], index);
      }
    }
  }
  context.putImageData(image, 0, 0);

  const half = (size / 2) * step;
  const north = offset(origin, half, 0).latitude;
  const east = offset(origin, half, Math.PI / 2).longitude;
  const south = offset(origin, half, Math.PI).latitude;
  const west = offset(origin, half, (3 * Math.PI) / 2).longitude;
  return {
    image: canvas.toDataURL('image/png'),
    bounds: [
      [south, west],
      [north, east],
    ],
  };
}
