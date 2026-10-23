import { calculateMpbr, MpbrInput } from './mpbr';

describe('calculateMpbr', () => {
  /** A .308 Win hunting load: 165 gr, G1 BC 0.45 at 820 m/s, under a scope 38 mm above the bore */
  const input: MpbrInput = { muzzleVelocity: 820, ballisticCoefficient: 0.45, sightHeight: 38, vitalZone: 8, zeroingDistance: 35 };

  it('should keep the bullet within the vital zone up to the MPBR', async () => {
    const result = (await calculateMpbr(input))!;

    expect(result.start).toBe(0);
    expect(result.nearZero).toBeGreaterThan(0);
    expect(result.nearZero).toBeLessThan(result.apex);
    expect(result.apex).toBeLessThan(result.end);
    expect(result.end).toBeGreaterThan(180);
    expect(result.end).toBeLessThan(230);
    // The trajectory peaks at the top of the zone, so 100 m is at most 4 cm high
    expect(result.impactAt100).toBeGreaterThan(2);
    expect(result.impactAt100).toBeLessThanOrEqual(4.01);
  });

  it('should reach further with a larger vital zone or a faster bullet', async () => {
    const base = (await calculateMpbr(input))!;

    expect((await calculateMpbr({ ...input, vitalZone: 15 }))!.end).toBeGreaterThan(base.end);
    expect((await calculateMpbr({ ...input, muzzleVelocity: 950 }))!.end).toBeGreaterThan(base.end);
  });

  it('should give the impact at the zeroing distance, below the aim before the near zero and above it after', async () => {
    const result = (await calculateMpbr(input))!;
    const before = (await calculateMpbr({ ...input, zeroingDistance: result.nearZero - 10 }))!;
    const after = (await calculateMpbr({ ...input, zeroingDistance: result.nearZero + 10 }))!;

    expect(before.impactAtZeroing).toBeLessThan(0);
    expect(after.impactAtZeroing).toBeGreaterThan(0);
    expect((await calculateMpbr({ ...input, zeroingDistance: 100 }))!.impactAtZeroing).toBeCloseTo(result.impactAt100, 5);
  });

  it('should start the range further out when the sight is higher above the bore than half the zone', async () => {
    // 4.5 cm below the line of sight at the muzzle, the zone reaching 4 cm below it
    const result = (await calculateMpbr({ ...input, sightHeight: 45 }))!;

    expect(result.start).toBeGreaterThan(0);
    expect(result.start).toBeLessThan(result.nearZero);
  });
});
