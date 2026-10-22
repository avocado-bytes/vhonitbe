import { contains, HuntingGroundsResponse, huntingGroundsUrl, toHuntingGrounds } from './hunting-ground';

describe('hunting ground', () => {
  /** Web Mercator meters of a point, as the service sends them */
  const mercator = (latitude: number, longitude: number): [number, number] => [
    (6378137 * longitude * Math.PI) / 180,
    6378137 * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)),
  ];
  const square = (latitude: number, longitude: number, size: number): [number, number][] => [
    mercator(latitude, longitude),
    mercator(latitude, longitude + size),
    mercator(latitude + size, longitude + size),
    mercator(latitude + size, longitude),
    mercator(latitude, longitude),
  ];
  const at = { latitude: 49.72, longitude: 13.95 };
  const fetchedAt = new Date('2026-10-22T10:00:00.000Z');

  it('should ask the service for a small square around the point in Web Mercator, with the + of the format encoded', () => {
    const url = new URL(huntingGroundsUrl(at));

    expect(url.origin + url.pathname).toBe('https://gp.nli.gov.cz/wfs_uhul/service.svc/get');
    expect(huntingGroundsUrl(at)).toContain('OUTPUTFORMAT=application%2Fgeo%2Bjson');
    expect(url.searchParams.get('TYPENAMES')).toBe('gmgml:mysl_honi');
    expect(url.searchParams.get('SRSNAME')).toBe('EPSG:3857');
    const [minX, minY, maxX, maxY, crs] = url.searchParams.get('BBOX')!.split(',');
    const [x, y] = mercator(at.latitude, at.longitude);
    expect(Number(minX)).toBeCloseTo(x - 1);
    expect(Number(maxY)).toBeCloseTo(y + 1);
    expect(Number(maxX) - Number(minX)).toBeCloseTo(2);
    expect(Number(maxY) - Number(minY)).toBeCloseTo(2);
    expect(crs).toBe('EPSG:3857');
  });

  it('should keep only the code, name, area and boundary, converted to latitude and longitude', () => {
    // The service also lists the holders' contacts
    const properties = { HONITBA: 'CZ2120404111', NAZEVHONITBY: 'BRDY  ', VYMERA_SA: 25665, UZIVATEL_EMAIL: 'someone@example.com' };
    const response: HuntingGroundsResponse = {
      features: [{ properties, geometry: { type: 'Polygon', coordinates: [square(49.7, 13.9, 0.1)] } }],
    };

    const [ground] = toHuntingGrounds(response, at, fetchedAt);

    expect(ground).toEqual({
      code: 'CZ2120404111',
      name: 'BRDY',
      area: 25665,
      outline: [[[
        { latitude: 49.7, longitude: 13.9 },
        { latitude: 49.7, longitude: 14 },
        { latitude: 49.8, longitude: 14 },
        { latitude: 49.8, longitude: 13.9 },
        { latitude: 49.7, longitude: 13.9 },
      ]]],
      searchedAt: at,
      fetchedAt: '2026-10-22T10:00:00.000Z',
    });
    expect(JSON.stringify(ground)).not.toContain('someone@example.com');
  });

  it('should leave out hunting grounds that only touch the point, unless none contains it', () => {
    const inside = { properties: { HONITBA: 'A', NAZEVHONITBY: 'Inside' }, geometry: { type: 'Polygon' as const, coordinates: [square(49.7, 13.9, 0.1)] } };
    const beside = { properties: { HONITBA: 'B', NAZEVHONITBY: 'Beside' }, geometry: { type: 'Polygon' as const, coordinates: [square(49.6, 13.9, 0.05)] } };

    expect(toHuntingGrounds({ features: [beside, inside] }, at, fetchedAt).map(({ code }) => code)).toEqual(['A']);
    expect(toHuntingGrounds({ features: [beside] }, at, fetchedAt).map(({ code }) => code)).toEqual(['B']);
  });

  it('should read multipolygons, fall back to the code for a missing name and skip features without a code or boundary', () => {
    const grounds = toHuntingGrounds(
      {
        features: [
          { properties: { HONITBA: 'A' }, geometry: { type: 'MultiPolygon', coordinates: [[square(49.7, 13.9, 0.1)], [square(50, 14, 0.1)]] } },
          { properties: {}, geometry: { type: 'Polygon', coordinates: [square(49.7, 13.9, 0.1)] } },
          { properties: { HONITBA: 'C' }, geometry: null },
        ],
      },
      at,
      fetchedAt,
    );

    expect(grounds).toHaveLength(1);
    expect(grounds[0].name).toBe('A');
    expect(grounds[0].area).toBeNull();
    expect(grounds[0].outline).toHaveLength(2);
  });

  it('should tell whether a point lies inside an outline, outside its holes', () => {
    const ring = (latitude: number, longitude: number, size: number) => [
      { latitude, longitude },
      { latitude, longitude: longitude + size },
      { latitude: latitude + size, longitude: longitude + size },
      { latitude: latitude + size, longitude },
    ];
    const outline = [[ring(49, 13, 1), ring(49.4, 13.4, 0.2)]];

    expect(contains(outline, { latitude: 49.2, longitude: 13.2 })).toBe(true);
    expect(contains(outline, { latitude: 49.5, longitude: 13.5 })).toBe(false);
    expect(contains(outline, { latitude: 50.5, longitude: 13.5 })).toBe(false);
  });
});
