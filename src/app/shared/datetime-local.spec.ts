import { fromDateTimeLocal, toDateTimeLocal } from './datetime-local';

describe('datetime-local', () => {
  it('should format a date in local time without seconds', () => {
    expect(toDateTimeLocal(new Date(2026, 0, 5, 7, 3, 59))).toBe('2026-01-05T07:03');
  });

  it('should convert a local value to an ISO timestamp', () => {
    expect(fromDateTimeLocal('2026-01-05T07:03')).toBe(new Date(2026, 0, 5, 7, 3).toISOString());
  });

  it('should round-trip a date to the minute', () => {
    const date = new Date(2026, 9, 16, 14, 25);
    expect(fromDateTimeLocal(toDateTimeLocal(date))).toBe(date.toISOString());
  });

  it.each(['', '2026-01-05', 'not a date', '2026-13-40T99:99'])('should reject %j', (value) => {
    expect(fromDateTimeLocal(value)).toBeNull();
  });
});
