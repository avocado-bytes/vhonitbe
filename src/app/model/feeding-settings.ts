/**
 * When and how often feeding places are tended. During the feeding season feeders are replenished
 * every few days; the season may span the turn of the year, e.g. October to March.
 */
export interface FeedingSettings {
  /** First month of the season, 1 = January */
  seasonStart: number;
  /** Last month of the season, included; before the start month when the season spans the new year */
  seasonEnd: number;
  /** How many days may pass between replenishing a feeder */
  replenishDays: number;
}

export const DEFAULT_FEEDING_SETTINGS: FeedingSettings = { seasonStart: 10, seasonEnd: 3, replenishDays: 5 };

export const MIN_REPLENISH_DAYS = 1;
export const MAX_REPLENISH_DAYS = 60;

export function isValidMonth(month: unknown): month is number {
  return Number.isInteger(month) && (month as number) >= 1 && (month as number) <= 12;
}

export function isValidReplenishDays(days: unknown): days is number {
  return Number.isInteger(days) && (days as number) >= MIN_REPLENISH_DAYS && (days as number) <= MAX_REPLENISH_DAYS;
}

/** Whether the date falls within the season, which may span the turn of the year */
export function isInSeason({ seasonStart, seasonEnd }: FeedingSettings, date: Date): boolean {
  const month = date.getMonth() + 1;
  return seasonStart <= seasonEnd ? month >= seasonStart && month <= seasonEnd : month >= seasonStart || month <= seasonEnd;
}

/** Where the feeding settings are kept, as they apply to this device's user rather than to stored records */
export const FEEDING_SETTINGS_STORAGE_KEY = 'vhonitbe.feeding-settings';

/** The settings saved earlier, with the defaults for anything missing or invalid; storage may be unavailable */
export function storedFeedingSettings(): FeedingSettings {
  try {
    const stored: Partial<FeedingSettings> = JSON.parse(globalThis.localStorage?.getItem(FEEDING_SETTINGS_STORAGE_KEY) ?? '{}');
    return {
      seasonStart: isValidMonth(stored.seasonStart) ? stored.seasonStart : DEFAULT_FEEDING_SETTINGS.seasonStart,
      seasonEnd: isValidMonth(stored.seasonEnd) ? stored.seasonEnd : DEFAULT_FEEDING_SETTINGS.seasonEnd,
      replenishDays: isValidReplenishDays(stored.replenishDays) ? stored.replenishDays : DEFAULT_FEEDING_SETTINGS.replenishDays,
    };
  } catch {
    return DEFAULT_FEEDING_SETTINGS;
  }
}

export function storeFeedingSettings(settings: FeedingSettings): void {
  try {
    globalThis.localStorage?.setItem(FEEDING_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Without storage the settings only last until the app is closed
  }
}
