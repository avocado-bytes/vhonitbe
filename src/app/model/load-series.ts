import { inRange, MUZZLE_VELOCITY_RANGE, NewAmmunition } from './ammunition';
import { FirearmSnapshot } from './event';

/**
 * One step of a load development series: a charge and seating depth, loaded and shot,
 * with how it grouped and how fast it was
 */
export interface TestLoad {
  id: string;
  /** Powder charge in grains; null when not given */
  powderCharge: number | null;
  /** Overall cartridge length in mm, which sets the seating depth; null when not given */
  overallLength: number | null;
  /** How many shots were fired; null when not given */
  shots: number | null;
  /** Group size in mm; null when not given */
  groupSize: number | null;
  /** The measured velocity of each shot, in m/s */
  velocities: number[];
  /** E.g. pressure signs such as flattened primers or a stiff bolt lift */
  notes: string;
  /** When the load was added to the ammunition list (ISO 8601); null or missing until then */
  promotedAt?: string | null;
}

export type NewTestLoad = Omit<TestLoad, 'id'>;

/**
 * A load development series: working up a handload for one caliber, keeping the components the same
 * and varying the charge and seating depth from one test load to the next
 */
export interface LoadSeries {
  id: string;
  /** As for a firearm, e.g. ".308 Win" */
  caliber: string;
  /** E.g. "Varget 168 SMK"; empty when not given, missing in older series */
  name?: string;
  /** The day the series was started, as "YYYY-MM-DD"; null when not given, missing in older series */
  startedAt?: string | null;
  /** The components kept the same throughout the series; empty or null when not given, missing in older series */
  bulletType?: string;
  /** In grains */
  bulletWeight?: number | null;
  powder?: string;
  primer?: string;
  brass?: string;
  /** Case length in mm, after trimming */
  caseLength?: number | null;
  /** The firearm the loads are tested in, copied as it was, like the firearm of a harvest */
  firearm?: FirearmSnapshot | null;
  /** The test loads, in the order they were added; missing in older series */
  loads?: TestLoad[];
}

/** The fields the user provides; `id` is set when stored */
export type NewLoadSeries = Omit<LoadSeries, 'id'>;

export const CASE_LENGTH_RANGE = { min: 10, max: 120 } as const;
export const GROUP_SIZE_RANGE = { min: 0.1, max: 2000 } as const;
export const SHOTS_RANGE = { min: 1, max: 100 } as const;

export interface VelocityStats {
  average: number;
  /** Extreme spread: the fastest minus the slowest shot */
  extremeSpread: number;
  /** Sample standard deviation; null with a single shot */
  standardDeviation: number | null;
}

/** Average, extreme spread and standard deviation of the velocities; null without any */
export function velocityStats(velocities: readonly number[]): VelocityStats | null {
  if (velocities.length === 0) {
    return null;
  }
  const average = velocities.reduce((sum, velocity) => sum + velocity, 0) / velocities.length;
  const standardDeviation =
    velocities.length > 1
      ? Math.sqrt(velocities.reduce((sum, velocity) => sum + (velocity - average) ** 2, 0) / (velocities.length - 1))
      : null;
  return { average, extremeSpread: Math.max(...velocities) - Math.min(...velocities), standardDeviation };
}

/**
 * The velocities as typed, one per shot, separated by commas, semicolons, spaces or new lines, with a decimal point.
 * Null when any is not a plausible muzzle velocity, which also catches a decimal comma read as a separator.
 */
export function parseVelocities(value: string): number[] | null {
  const velocities = value
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number);
  return velocities.every((velocity) => inRange(velocity, MUZZLE_VELOCITY_RANGE)) ? velocities : null;
}

/** What promoting a test load to the ammunition list still lacks; null when it can be promoted */
export function promotionBlocker(series: LoadSeries, load: TestLoad): 'bullet-weight' | 'velocity' | null {
  if (!series.bulletWeight) {
    return 'bullet-weight';
  }
  if (load.velocities.length === 0) {
    return 'velocity';
  }
  return null;
}

/**
 * A handload for the ammunition list, copied from the series' components and the test load;
 * its muzzle velocity is the average of the measured velocities, rounded to 1 m/s
 */
export function promotedAmmunition(series: LoadSeries, load: TestLoad): NewAmmunition {
  return {
    caliber: series.caliber,
    source: 'handload',
    product: '',
    bulletWeight: series.bulletWeight ?? 0,
    muzzleVelocity: Math.round(velocityStats(load.velocities)?.average ?? 0),
    bulletType: series.bulletType ?? '',
    ballisticCoefficient: null,
    primer: series.primer ?? '',
    powder: series.powder ?? '',
    powderCharge: load.powderCharge,
    brass: series.brass ?? '',
    brassFirings: null,
    overallLength: load.overallLength,
  };
}
