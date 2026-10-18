import {
  DEFAULT_FEEDING_SETTINGS,
  FEEDING_SETTINGS_STORAGE_KEY,
  isInSeason,
  storedFeedingSettings,
  storeFeedingSettings,
} from './feeding-settings';

describe('feeding settings', () => {
  beforeEach(() => localStorage.clear());

  it('should default to October through March with replenishing every 5 days', () => {
    expect(storedFeedingSettings()).toEqual({ seasonStart: 10, seasonEnd: 3, replenishDays: 5 });
  });

  it('should tell whether a date is in a season spanning the new year, including the end month', () => {
    const season = DEFAULT_FEEDING_SETTINGS;

    expect(isInSeason(season, new Date(2026, 9, 1))).toBe(true);
    expect(isInSeason(season, new Date(2027, 0, 15))).toBe(true);
    expect(isInSeason(season, new Date(2027, 2, 31))).toBe(true);
    expect(isInSeason(season, new Date(2027, 3, 1))).toBe(false);
    expect(isInSeason(season, new Date(2026, 8, 30))).toBe(false);
  });

  it('should tell whether a date is in a season within one year', () => {
    const season = { ...DEFAULT_FEEDING_SETTINGS, seasonStart: 11, seasonEnd: 12 };

    expect(isInSeason(season, new Date(2026, 10, 1))).toBe(true);
    expect(isInSeason(season, new Date(2027, 0, 1))).toBe(false);
  });

  it('should restore stored settings and replace invalid values with the defaults', () => {
    storeFeedingSettings({ seasonStart: 11, seasonEnd: 2, replenishDays: 7 });
    expect(storedFeedingSettings()).toEqual({ seasonStart: 11, seasonEnd: 2, replenishDays: 7 });

    localStorage.setItem(FEEDING_SETTINGS_STORAGE_KEY, JSON.stringify({ seasonStart: 13, seasonEnd: 2, replenishDays: 0 }));
    expect(storedFeedingSettings()).toEqual({ seasonStart: 10, seasonEnd: 2, replenishDays: 5 });

    localStorage.setItem(FEEDING_SETTINGS_STORAGE_KEY, 'not json');
    expect(storedFeedingSettings()).toEqual(DEFAULT_FEEDING_SETTINGS);
  });
});
