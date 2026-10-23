import { Service } from '@angular/core';

/**
 * Maximum point blank range (MPBR): the distances over which the bullet stays within the vital zone
 * when aiming at its centre, for the zero that makes the trajectory peak exactly at the top of the zone.
 * Wind, weather and spin drift are left out: the bullet flies in the ICAO standard atmosphere at sea level.
 */

/** What the calculation needs from the ammunition, the firearm and the shooter */
export interface MpbrInput {
  /** m/s */
  muzzleVelocity: number;
  /** G1 */
  ballisticCoefficient: number;
  /** Height of the sight above the bore, in mm */
  sightHeight: number;
  /** Diameter of the vital zone, in cm */
  vitalZone: number;
  /** Where the shooter zeroes the rifle, in m */
  zeroingDistance: number;
}

export interface MpbrResult {
  /** From where the bullet is within the vital zone, in m; 0 unless the sight is higher above the bore than half the zone */
  start: number;
  /** The maximum point blank range: where the bullet falls below the vital zone, in m */
  end: number;
  /** Where the bullet first crosses the line of sight, in m */
  nearZero: number;
  /** Where the bullet is highest above the line of sight, in m */
  apex: number;
  /** How high the bullet is there, in cm: half the vital zone */
  apexHeight: number;
  /** The distance the impact below is given for, in m */
  zeroingDistance: number;
  /** The bullet's height above the point of aim at the shooter's zeroing distance, in cm; below it when negative */
  impactAtZeroing: number;
  /** The bullet's height above the point of aim at 100 m, in cm */
  impactAt100: number;
}

/** Far enough for the MPBR of any hunting cartridge */
const MAX_RANGE = 1000;
/** Barrel elevations searched, in MOA above the line of sight */
const MAX_ELEVATION = 240;
/** Bisection steps; each halves the elevation interval, ending far below 0.01 MOA */
const ITERATIONS = 30;

/** A trajectory as heights above the line of sight in cm, at every metre from the muzzle */
type Heights = number[];

/** Leaves the library, with its WebAssembly engine, out of the initial bundle */
async function loadEngine() {
  const { Ammo, Atmo, Calculator, Distance, DragModel, DragTables, Shot, UNew, Weapon } = await import('js-ballistics');
  const calculator = new Calculator();
  return async (input: MpbrInput, elevation: number): Promise<Heights> => {
    const shot = new Shot({
      weapon: new Weapon({ sightHeight: UNew.Millimeter(input.sightHeight), zeroElevation: UNew.MOA(elevation) }),
      ammo: new Ammo({
        dm: new DragModel({ bc: input.ballisticCoefficient, dragTable: DragTables['G1'] }),
        mv: UNew.MPS(input.muzzleVelocity),
      }),
      atmo: Atmo.standard(),
    });
    // A slow bullet may not reach the full range; its trajectory then ends early
    const hit = await calculator.fire({
      shot,
      trajectoryRange: UNew.Meter(MAX_RANGE),
      trajectoryStep: UNew.Meter(1),
      raiseRangeError: false,
    });
    return hit.samples.map((sample) => sample.height.In(Distance.Centimeter));
  };
}

/** The MPBR, or null when the bullet cannot stay within the zone, e.g. when it is too slow to reach its top */
export async function calculateMpbr(input: MpbrInput): Promise<MpbrResult | null> {
  const trajectory = await loadEngine();
  const top = input.vitalZone / 2;
  const peak = (heights: Heights) => Math.max(...heights);

  let low = 0;
  let high = MAX_ELEVATION;
  if (peak(await trajectory(input, high)) < top) {
    return null;
  }
  // The higher the barrel points, the higher the trajectory peaks
  for (let i = 0; i < ITERATIONS; i++) {
    const middle = (low + high) / 2;
    if (peak(await trajectory(input, middle)) < top) {
      low = middle;
    } else {
      high = middle;
    }
  }
  const heights = await trajectory(input, high);
  const apex = heights.indexOf(peak(heights));

  const start = heights[0] >= -top ? 0 : crossing(heights, -top, 0, 'up');
  const end = crossing(heights, -top, apex, 'down');
  const nearZero = crossing(heights, 0, 0, 'up');
  if (start === null || end === null || nearZero === null) {
    return null;
  }
  return {
    start: Math.round(start),
    end: Math.round(end),
    nearZero: Math.round(nearZero),
    apex,
    apexHeight: heights[apex],
    zeroingDistance: input.zeroingDistance,
    impactAtZeroing: heightAt(heights, input.zeroingDistance),
    impactAt100: heightAt(heights, 100),
  };
}

/** Calculates the MPBR; injected, so components can be tested without the engine */
@Service()
export class MpbrCalculator {
  calculate(input: MpbrInput): Promise<MpbrResult | null> {
    return calculateMpbr(input);
  }
}

/** The first distance from `from` where the trajectory crosses the height in the given direction, between whole metres */
function crossing(heights: Heights, height: number, from: number, direction: 'up' | 'down'): number | null {
  for (let i = from; i < heights.length - 1; i++) {
    const [a, b] = [heights[i], heights[i + 1]];
    if (direction === 'up' ? a < height && b >= height : a > height && b <= height) {
      return i + (height - a) / (b - a);
    }
  }
  return null;
}

function heightAt(heights: Heights, distance: number): number {
  const metre = Math.min(Math.floor(distance), heights.length - 2);
  const share = distance - metre;
  return heights[metre] + share * (heights[metre + 1] - heights[metre]);
}
