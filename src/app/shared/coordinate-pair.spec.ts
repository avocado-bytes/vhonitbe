import { parseCoordinatePair } from './coordinate-pair';

describe('parseCoordinatePair', () => {
  it('should read the formats copied from map apps', () => {
    const position = { latitude: 49.7215, longitude: 13.9512 };
    expect(parseCoordinatePair('49.7215, 13.9512')).toEqual(position);
    expect(parseCoordinatePair('49.7215N, 13.9512E')).toEqual(position);
    expect(parseCoordinatePair('N 49.7215, E 13.9512')).toEqual(position);
    expect(parseCoordinatePair('49.7215° N 13.9512° E')).toEqual(position);
    expect(parseCoordinatePair('  49,7215, 13,9512 ')).toEqual(position);
    expect(parseCoordinatePair('49.7215;13.9512')).toEqual(position);
  });

  it('should round to six decimals', () => {
    expect(parseCoordinatePair('49.7215067N, 13.9512006E')).toEqual({ latitude: 49.721507, longitude: 13.951201 });
  });

  it('should take the sign from the hemisphere and read longitude first when it is named first', () => {
    expect(parseCoordinatePair('33.8688S, 151.2093E')).toEqual({ latitude: -33.8688, longitude: 151.2093 });
    expect(parseCoordinatePair('E 13.9512, N 49.7215')).toEqual({ latitude: 49.7215, longitude: 13.9512 });
    expect(parseCoordinatePair('-12.5, -77.03')).toEqual({ latitude: -12.5, longitude: -77.03 });
  });

  it('should refuse anything else', () => {
    expect(parseCoordinatePair('49.7215')).toBeNull();
    expect(parseCoordinatePair('91, 13')).toBeNull();
    expect(parseCoordinatePair('49.7215, 13.9512, 5')).toBeNull();
    expect(parseCoordinatePair('somewhere')).toBeNull();
  });
});
