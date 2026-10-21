/** Factory-made ammunition, or cartridges loaded by the user */
export const AMMUNITION_SOURCES = ['factory', 'handload'] as const;
export type AmmunitionSource = (typeof AMMUNITION_SOURCES)[number];

/** A kind of cartridge the user shoots */
export interface Ammunition {
  id: string;
  /** As for a firearm, e.g. ".308 Win" */
  caliber: string;
  source: AmmunitionSource;
  /** Bullet weight in grains */
  bulletWeight: number;
  /** Muzzle velocity in m/s */
  muzzleVelocity: number;
  /** E.g. "Soft point" or a product name such as "Nosler Partition"; empty when not given */
  bulletType: string;
  /** G1 ballistic coefficient; null when not known */
  ballisticCoefficient: number | null;
  /** The components of a handload, e.g. "CCI 200"; empty for factory ammunition and when not given */
  primer: string;
  powder: string;
  brass: string;
  /** How many times the brass has been fired before; null for factory ammunition and when not given */
  brassFirings: number | null;
  /** Make and product name of factory ammunition, e.g. "RWS EVO"; empty for a handload, missing in older ammunition */
  product?: string;
  /** Powder charge of a handload in grains; null for factory ammunition and when not given, missing in older ammunition */
  powderCharge?: number | null;
  /** Overall length of a handloaded cartridge in mm; null for factory ammunition and when not given, missing in older ammunition */
  overallLength?: number | null;
}

/** The fields the user provides; `id` is set when stored */
export type NewAmmunition = Omit<Ammunition, 'id'>;

export const BULLET_WEIGHT_RANGE = { min: 1, max: 1000 } as const;
export const MUZZLE_VELOCITY_RANGE = { min: 100, max: 2000 } as const;
export const BALLISTIC_COEFFICIENT_RANGE = { min: 0.01, max: 2 } as const;
export const POWDER_CHARGE_RANGE = { min: 0.1, max: 200 } as const;
export const OVERALL_LENGTH_RANGE = { min: 10, max: 150 } as const;
/** New brass has been fired 0 times */
export const BRASS_FIRINGS_RANGE = { min: 0, max: 99 } as const;

/** A decimal number as typed, with a decimal comma or point; null for anything else */
export function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}

export function inRange(value: number | null, { min, max }: { min: number; max: number }): value is number {
  return value !== null && value >= min && value <= max;
}
