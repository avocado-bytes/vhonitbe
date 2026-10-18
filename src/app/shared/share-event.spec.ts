import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { HuntingEvent } from '../model/event';
import { eventShareText, placeShareText } from './share-event';

describe('eventShareText', () => {
  let translate: TranslateService;
  const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });

  const event = (overrides: Partial<HuntingEvent> = {}): HuntingEvent => ({
    id: 'a',
    type: 'spotting',
    animal: 'roe-deer',
    location: null,
    note: 'Private remark',
    occurredAt: '2026-10-01T06:30:00.000Z',
    createdAt: '2026-10-01T06:31:00.000Z',
    updatedAt: '2026-10-01T06:31:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslateService({ lang: 'en' })] });
    translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      ITEMS: { spotting: 'Sighting', 'hunting-stand': 'Hunting stand' },
      ANIMALS: { 'roe-deer': 'Roe deer' },
      SEXES: { mixed: 'Mixed', female: 'Female' },
      OVERVIEW: { HERD: 'Herd', HERD_OF: 'Herd of {{count}}', TAG_NUMBER: 'Tag number' },
      FEEDING: { TYPES: { 'salt-lick': 'Salt lick' } },
      SHARE: { MAPY_CZ: 'Mapy.cz' },
    });
    translate.use('en');
  });

  it('should list the animal, sex and herd after the type', () => {
    const text = eventShareText(event({ sex: 'mixed', herd: true, herdSize: 7 }), translate, dateFormat);

    expect(text.split('\n')[0]).toBe('Sighting – Roe deer · Mixed · Herd of 7');
  });

  it('should say herd without a count when the animals were not counted', () => {
    const text = eventShareText(event({ sex: 'female', herd: true, herdSize: null }), translate, dateFormat);

    expect(text.split('\n')[0]).toBe('Sighting – Roe deer · Female · Herd');
  });

  it('should show only the type without animal details', () => {
    const text = eventShareText(event({ type: 'hunting-stand', animal: null }), translate, dateFormat);

    expect(text.split('\n')[0]).toBe('Hunting stand');
  });

  it('should add the tag number after the date', () => {
    const lines = eventShareText(event({ tagNumber: '12345678' }), translate, dateFormat).split('\n');

    expect(lines[2]).toBe('🏷️ Tag number 12 345678');
  });

  it('should share a feeding place without a date or its note', () => {
    const place = { id: 'b', type: 'salt-lick' as const, location: { latitude: 49, longitude: 13.5 }, note: 'Private remark', photoId: null };

    expect(placeShareText(place, translate).split('\n')).toEqual([
      'Salt lick',
      '',
      '📍 49.00000, 13.50000',
      expect.stringMatching(/^Mapy\.cz: https:\/\/mapy\.cz\//),
    ]);
  });

  it('should leave out the note', () => {
    expect(eventShareText(event(), translate, dateFormat)).not.toContain('Private remark');
  });

  it('should add the date, coordinates and a Mapy.cz link', () => {
    const text = eventShareText(event({ location: { latitude: 49.123456, longitude: 16.654321 } }), translate, dateFormat);

    expect(text).toContain(`📅 ${dateFormat.format(new Date('2026-10-01T06:30:00.000Z'))}`);
    expect(text).toContain('📍 49.12346, 16.65432');
    expect(text).not.toContain('google');
    expect(text).toContain('Mapy.cz: https://mapy.cz/fnc/v1/showmap?mapset=outdoor&center=16.654321,49.123456&zoom=15&marker=true');
  });
});
