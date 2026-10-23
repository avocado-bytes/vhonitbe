import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { HuntingEvent } from '../model/event';
import { EventView } from './event-view';

describe('EventView', () => {
  let fixture: ComponentFixture<EventView>;

  const event: HuntingEvent = {
    id: 'e1',
    type: 'harvest',
    animal: 'wild-boar',
    sex: 'male',
    tagNumber: '12345678',
    location: { latitude: 49.7215, longitude: 13.9512 },
    note: 'Found after 30 m\nClean shot',
    occurredAt: '2026-10-20T16:30:00.000Z',
    createdAt: '2026-10-20T16:31:00.000Z',
    updatedAt: '2026-10-20T16:31:00.000Z',
    firearm: {
      name: 'Blaser R8',
      caliber: '.308 Win',
      optics: 'riflescope',
      opticsModel: 'Zeiss V8',
      suppressed: true,
      barrelLength: 520,
      threadPitch: { numerator: 1, denominator: 11 },
    },
    ammunition: {
      caliber: '.308 Win',
      source: 'handload',
      product: '',
      bulletWeight: 165,
      muzzleVelocity: 820,
      bulletType: 'Nosler Partition',
      ballisticCoefficient: 0.41,
      primer: 'CCI 200',
      powder: 'Vihtavuori N140',
      powderCharge: 44.5,
      brass: 'Lapua',
      brassFirings: 2,
      overallLength: 71.1,
    },
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const section = (id: string) => element().querySelector(`[aria-labelledby="event-view-${id}"]`) as HTMLElement | null;
  const details = (id: string) =>
    Array.from(section(id)!.querySelectorAll('dt')).map((dt) => `${dt.textContent?.trim()}: ${dt.nextElementSibling?.textContent?.trim()}`);
  const show = async (shown: HuntingEvent) => {
    fixture.componentRef.setInput('event', shown);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventView],
      providers: [provideTranslateService({ lang: 'en' }), provideMockStore({ initialState: { settings: { theme: 'light', language: 'en' } } })],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      ANIMALS: { 'wild-boar': 'Wild boar' },
      SEXES: { male: 'Male' },
      ADD_ITEM: {
        ANIMAL: 'Animal',
        SEX: 'Sex',
        TAG_NUMBER: 'Tag number',
        FIREARM: 'Firearm',
        AMMUNITION: 'Ammunition',
        NOTE: 'Note',
        SHOOTER_POSITION: "Shooter's position",
        SHOT_DISTANCE: 'Shooting distance',
      },
      FIREARMS: {
        OPTICS: { riflescope: 'Riflescope', none: 'No optic sight' },
        FORM: { CALIBER: 'Caliber', OPTICS: 'Optics', BARREL_LENGTH: 'Barrel length', THREAD_PITCH: 'Thread pitch' },
      },
      AMMUNITION: {
        SOURCES: { handload: 'Handload', factory: 'Factory' },
        FORM: { BULLET_TYPE: 'Bullet type', BULLET_WEIGHT: 'Bullet weight', MUZZLE_VELOCITY: 'Muzzle velocity', POWDER_CHARGE: 'Charge' },
      },
      EVENT_VIEW: { GAME: 'Game', SUPPRESSOR: 'Suppressor', YES: 'Yes', NO: 'No', SOURCE: 'Origin' },
    });
    fixture = TestBed.createComponent(EventView);
    await show(event);
  });

  it('should show when it happened in full', () => {
    expect(element().querySelector('time')?.textContent?.trim()).toBe(
      new Intl.DateTimeFormat('en', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(event.occurredAt)),
    );
  });

  it('should show the animal with its tag number', () => {
    expect(details('animal')).toEqual(['Animal: Wild boar', 'Sex: Male', 'Tag number: 12 345678']);
  });

  it("should show the shooter's position and the shooting distance only when given", async () => {
    expect(section('shot')).toBeNull();

    await show({ ...event, shooterLocation: { latitude: 49.7225, longitude: 13.9512 }, shotDistance: 1112 });

    expect(details('shot')).toEqual(["Shooter's position: 49.72250, 13.95120", 'Shooting distance: 1,112 m']);
  });

  it('should show the firearm and ammunition as recorded, in full', () => {
    expect(section('firearm')?.querySelector('p')?.textContent?.trim()).toBe('Blaser R8');
    expect(details('firearm')).toEqual([
      'Caliber: .308 Win',
      'Optics: Riflescope Zeiss V8',
      'Barrel length: 520 mm',
      'Thread pitch: 1:11',
      'Suppressor: Yes',
    ]);
    expect(details('ammunition')).toContain('Origin: Handload');
    expect(details('ammunition')).toContain('Bullet type: Nosler Partition');
    expect(details('ammunition')).toContain('Charge: 44.5 gr');
  });

  it('should show the location on a map with its coordinates, and the note with its line breaks', () => {
    expect(section('location')?.querySelector('app-event-map')).not.toBeNull();
    expect(section('location')?.textContent).toContain('49.72150, 13.95120');
    expect(section('note')?.querySelector('.view-note')?.textContent).toBe('Found after 30 m\nClean shot');
  });

  it('should leave out what was not given', async () => {
    await show({ ...event, type: 'tracks', animal: null, sex: null, tagNumber: null, firearm: null, ammunition: null, location: null, note: '' });

    expect(['animal', 'firearm', 'ammunition', 'location', 'note', 'photo'].map((id) => section(id))).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });
});
