import { LoadSeries, parseVelocities, promotedAmmunition, promotionBlocker, TestLoad, velocityStats } from './load-series';

describe('load series', () => {
  const series: LoadSeries = {
    id: 's1',
    caliber: '.308 Win',
    name: 'Varget 168 SMK',
    bulletType: 'Sierra MatchKing',
    bulletWeight: 168,
    powder: 'Hodgdon Varget',
    primer: 'CCI BR-2',
    brass: 'Lapua',
    caseLength: 51,
  };
  const load: TestLoad = {
    id: 'l1',
    powderCharge: 44.5,
    overallLength: 71.1,
    shots: 3,
    groupSize: 18,
    velocities: [812, 818, 815],
    notes: '',
  };

  describe('velocityStats', () => {
    it('should give the average, extreme spread and sample standard deviation', () => {
      const stats = velocityStats([812, 818, 815])!;

      expect(stats.average).toBe(815);
      expect(stats.extremeSpread).toBe(6);
      expect(stats.standardDeviation).toBeCloseTo(3, 10);
    });

    it('should leave out the deviation of a single shot, and give nothing without any', () => {
      expect(velocityStats([820])).toEqual({ average: 820, extremeSpread: 0, standardDeviation: null });
      expect(velocityStats([])).toBeNull();
    });
  });

  describe('parseVelocities', () => {
    it('should read velocities separated by commas, semicolons, spaces or new lines', () => {
      expect(parseVelocities('812, 818,815; 820\n 811.5')).toEqual([812, 818, 815, 820, 811.5]);
      expect(parseVelocities('  ')).toEqual([]);
    });

    it('should refuse anything that is not a plausible velocity, such as a decimal comma read as a separator', () => {
      expect(parseVelocities('820,5')).toBeNull();
      expect(parseVelocities('812, fast')).toBeNull();
      expect(parseVelocities('5000')).toBeNull();
    });
  });

  describe('promotion', () => {
    it('should need the bullet weight of the series and a velocity of the load', () => {
      expect(promotionBlocker(series, load)).toBeNull();
      expect(promotionBlocker({ ...series, bulletWeight: null }, load)).toBe('bullet-weight');
      expect(promotionBlocker(series, { ...load, velocities: [] })).toBe('velocity');
    });

    it('should copy the components of the series and the load into a handload, with the average velocity', () => {
      expect(promotedAmmunition(series, { ...load, velocities: [812, 818, 816] })).toEqual({
        caliber: '.308 Win',
        source: 'handload',
        product: '',
        bulletWeight: 168,
        muzzleVelocity: 815,
        bulletType: 'Sierra MatchKing',
        ballisticCoefficient: null,
        primer: 'CCI BR-2',
        powder: 'Hodgdon Varget',
        powderCharge: 44.5,
        brass: 'Lapua',
        brassFirings: null,
        overallLength: 71.1,
      });
    });
  });
});
