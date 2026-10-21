/** Kinds of sights; a firearm without one is the default */
export const OPTICS = [
  'none', // bez optiky
  'riflescope', // puškohled
  'red-dot', // kolimátor
  'thermal', // termovize
  'night-vision', // noční vidění
] as const;
export type Optics = (typeof OPTICS)[number];

/** Cartridges common in Czech hunting, offered when entering the caliber; any other can be typed in */
export const COMMON_CALIBERS = [
  '.22 LR',
  '.22 WMR',
  '.222 Rem',
  '.223 Rem',
  '.22-250 Rem',
  '.243 Win',
  '6.5×55 SE',
  '6.5×57 R',
  '6.5 Creedmoor',
  '.270 Win',
  '7×57',
  '7×64',
  '7×65 R',
  '7 mm Rem Mag',
  '.308 Win',
  '.30-06 Sprg',
  '.300 Win Mag',
  '8×57 IS',
  '8×57 IRS',
  '8×68 S',
  '9.3×62',
  '9.3×74 R',
  '.375 H&H Mag',
  '12/70',
  '12/76',
  '16/70',
  '20/76',
] as const;

/** A firearm of the user */
export interface Firearm {
  id: string;
  name: string;
  /** As the user writes it, e.g. ".308 Win" or "7×64" */
  caliber: string;
  optics: Optics;
  /** Make and model of the sight, e.g. "Zeiss Victory V8 2.8-20×56"; only with optics, missing in older firearms */
  opticsModel?: string | null;
  /** Fitted with a suppressor (tlumič); missing in older firearms */
  suppressed?: boolean;
  /** Barrel length in mm, whatever unit it was entered in; null when not given, missing in older firearms */
  barrelLength?: number | null;
  /** Thread pitch as a ratio, e.g. 1:10; null when not given, missing in older firearms */
  threadPitch?: ThreadPitch | null;
}

/** The two numbers of a ratio written with a colon, e.g. 1:10 */
export interface ThreadPitch {
  numerator: number;
  denominator: number;
}

/** Each number of the thread pitch */
export const THREAD_PITCH_RANGE = { min: 0.1, max: 100 } as const;

/** The thread pitch as written, e.g. "1:10" */
export function formatThreadPitch({ numerator, denominator }: ThreadPitch, numberFormat: Intl.NumberFormat): string {
  return `${numberFormat.format(numerator)}:${numberFormat.format(denominator)}`;
}

/** Barrel lengths can be entered in either unit, but are stored in mm */
export const LENGTH_UNITS = ['mm', 'in'] as const;
export type LengthUnit = (typeof LENGTH_UNITS)[number];

const MM_PER_INCH = 25.4;
/** From a short pistol barrel to a long shotgun barrel */
export const BARREL_LENGTH_RANGE_MM = { min: 50, max: 1500 } as const;

/** The length in mm, rounded to a tenth of a millimetre */
export function toMillimetres(length: number, unit: LengthUnit): number {
  return Math.round((unit === 'in' ? length * MM_PER_INCH : length) * 10) / 10;
}

/** The allowed barrel lengths in the given unit, rounded inwards to a tenth */
export function barrelLengthRange(unit: LengthUnit): { min: number; max: number } {
  if (unit === 'mm') {
    return BARREL_LENGTH_RANGE_MM;
  }
  return {
    min: Math.ceil((BARREL_LENGTH_RANGE_MM.min / MM_PER_INCH) * 10) / 10,
    max: Math.floor((BARREL_LENGTH_RANGE_MM.max / MM_PER_INCH) * 10) / 10,
  };
}

/** The fields the user provides; `id` is set when stored */
export type NewFirearm = Omit<Firearm, 'id'>;

/** A short name for a firearm in a list or dropdown, e.g. "Blaser R8 (.308 Win)" */
export function firearmLabel(firearm: Pick<Firearm, 'name' | 'caliber'>): string {
  return `${firearm.name} (${firearm.caliber})`;
}
