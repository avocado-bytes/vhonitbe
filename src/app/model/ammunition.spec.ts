import { BALLISTIC_COEFFICIENT_RANGE, inRange, parseDecimal } from './ammunition';

describe('ammunition numbers', () => {
  it('should read a decimal comma or point and whole numbers', () => {
    expect(parseDecimal('0,447')).toBe(0.447);
    expect(parseDecimal(' 0.447 ')).toBe(0.447);
    expect(parseDecimal('165')).toBe(165);
  });

  it('should refuse anything that is not a plain positive number', () => {
    for (const value of ['', ' ', 'abc', '-1', '1e3', '1,2,3', '.5', '5.']) {
      expect(parseDecimal(value), value).toBeNull();
    }
  });

  it('should check a number against its range', () => {
    expect(inRange(0.447, BALLISTIC_COEFFICIENT_RANGE)).toBe(true);
    expect(inRange(2.5, BALLISTIC_COEFFICIENT_RANGE)).toBe(false);
    expect(inRange(null, BALLISTIC_COEFFICIENT_RANGE)).toBe(false);
  });
});
