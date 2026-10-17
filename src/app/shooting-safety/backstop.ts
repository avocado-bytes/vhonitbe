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
  /** Beyond `backstopDistance`, terrain stopping the bullet within this distance still counts as a distant backstop */
  distantBackstopDistance: number;
  /** A shot this many degrees higher than aimed must still be stopped by a distant backstop */
  aimMargin: number;
}

/** A standing shot at game; conservative, as bullet drop is ignored */
export const DEFAULT_BACKSTOP_OPTIONS: BackstopOptions = {
  radius: 3000,
  rays: 720,
  step: 10,
  muzzleHeight: 1.5,
  targetHeight: 0.8,
  backstopDistance: 50,
  distantBackstopDistance: 300,
  aimMargin: 0.5,
};

/** The target can't be seen, so it can't be shot at */
export const HIDDEN = 0;
/** The terrain stops a bullet shortly behind the target */
export const BACKSTOP = 1;
/** A bullet passing the target would fly on */
export const NO_BACKSTOP = 2;
/** The terrain stops the bullet, but further behind the target; the ground in between is in the line of fire */
export const DISTANT_BACKSTOP = 3;

export interface BackstopGrid {
  options: BackstopOptions;
  /** Samples per direction; the sample `i` lies `(i + 1) * step` meters away */
  steps: number;
  /** One of HIDDEN, BACKSTOP, DISTANT_BACKSTOP or NO_BACKSTOP per direction and sample: `cells[ray * steps + i]` */
  cells: Uint8Array;
}

/**
 * Classifies the terrain around `origin` by casting rays outwards. For every sample the shot aims at
 * the target above the ground there; it has a backstop when the ground rises above the continued line
 * of fire within `backstopDistance` behind the target. Otherwise it has a distant backstop when the ground
 * rises above that line, raised by `aimMargin` to allow for a high shot, within `distantBackstopDistance`.
 */
export function analyzeBackstop(
  heightAt: (point: GeoPoint) => number,
  origin: GeoPoint,
  options: BackstopOptions = DEFAULT_BACKSTOP_OPTIONS,
): BackstopGrid {
  const { radius, rays, step, muzzleHeight, targetHeight, backstopDistance, distantBackstopDistance, aimMargin } = options;
  const steps = Math.floor(radius / step);
  const behind = Math.ceil(backstopDistance / step);
  const distantBehind = Math.ceil(distantBackstopDistance / step);
  const margin = Math.tan((aimMargin * Math.PI) / 180);
  const muzzle = heightAt(origin) + muzzleHeight;
  const cells = new Uint8Array(rays * steps);
  // ground[i] is the height i * step meters away, lowered by the earth's curvature
  const ground = new Float64Array(steps + Math.max(behind, distantBehind) + 1);

  /** Whether the ground rises above the line of fire with `slope` within `count` samples after sample `from` */
  const stopsWithin = (from: number, count: number, slope: number): boolean => {
    for (let j = from + 1; j <= from + count; j++) {
      if (ground[j] >= muzzle + slope * j * step) {
        return true;
      }
    }
    return false;
  };

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
        cells[ray * steps + i - 1] = stopsWithin(i, behind, slope)
          ? BACKSTOP
          : stopsWithin(i + behind, distantBehind - behind, slope + margin)
            ? DISTANT_BACKSTOP
            : NO_BACKSTOP;
      }
      horizon = Math.max(horizon, (ground[i] - muzzle) / (i * step));
    }
  }
  return { options, steps, cells };
}

const COLORS: Record<number, [number, number, number] | undefined> = {
  [BACKSTOP]: [25, 135, 84],
  [NO_BACKSTOP]: [220, 53, 69],
  [DISTANT_BACKSTOP]: [255, 193, 7],
};

/** Draws the grid as a square image centered on `origin`, one pixel per sample step */
export async function renderBackstop(grid: BackstopGrid, origin: GeoPoint): Promise<BackstopOverlay> {
  const { radius, rays, step } = grid.options;
  const size = 2 * Math.ceil(radius / step);
  // An offscreen canvas also works inside a web worker
  const canvas = new OffscreenCanvas(size, size);
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
    image: await toDataUrl(await canvas.convertToBlob({ type: 'image/png' })),
    bounds: [
      [south, west],
      [north, east],
    ],
  };
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
