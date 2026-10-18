import { FeedingPlace, needsReplenishing } from './feeding-place';
import { DEFAULT_FEEDING_SETTINGS } from './feeding-settings';

describe('needsReplenishing', () => {
  const now = new Date('2026-10-20T12:00:00.000Z');
  const season = DEFAULT_FEEDING_SETTINGS;
  const place = (lastReplenishedAt: string | null | undefined): FeedingPlace => ({
    id: 'a',
    type: 'feeding',
    location: null,
    note: '',
    photoId: null,
    lastReplenishedAt,
  });

  it('should need replenishing when never replenished, also for places stored before the field existed', () => {
    expect(needsReplenishing(place(null), season, now)).toBe(true);
    expect(needsReplenishing(place(undefined), season, now)).toBe(true);
  });

  it('should need replenishing only once the interval has passed', () => {
    expect(needsReplenishing(place('2026-10-15T12:00:00.000Z'), season, now)).toBe(false);
    expect(needsReplenishing(place('2026-10-15T11:59:00.000Z'), season, now)).toBe(true);
    expect(needsReplenishing(place('2026-10-15T11:59:00.000Z'), { ...season, replenishDays: 6 }, now)).toBe(false);
  });

  it('should never need replenishing outside of the feeding season', () => {
    const summer = new Date('2026-07-01T12:00:00.000Z');

    expect(needsReplenishing(place(null), season, summer)).toBe(false);
    expect(needsReplenishing(place('2026-01-01T12:00:00.000Z'), season, summer)).toBe(false);
  });
});
