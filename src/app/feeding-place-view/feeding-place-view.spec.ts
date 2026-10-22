import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { FeedingPlace } from '../model/feeding-place';
import { initialState } from '../state/feeding/feeding.reducer';
import { FeedingPlaceView } from './feeding-place-view';

describe('FeedingPlaceView', () => {
  let fixture: ComponentFixture<FeedingPlaceView>;

  const place: FeedingPlace = {
    id: 'f1',
    type: 'feeding',
    location: { latitude: 49.7255, longitude: 13.9442 },
    note: 'Feeder by the big clearing',
    photoId: null,
    lastReplenishedAt: '2026-10-19T08:00:00.000Z',
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const create = async (shown: FeedingPlace, now: string) => {
    vi.useFakeTimers({ now: new Date(now), toFake: ['Date'] });
    fixture = TestBed.createComponent(FeedingPlaceView);
    fixture.componentRef.setInput('place', shown);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedingPlaceView],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({
          initialState: {
            feeding: { ...initialState, settings: { seasonStart: 10, seasonEnd: 3, replenishDays: 5 } },
            settings: { theme: 'light', language: 'en' },
          },
        }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      FEEDING: { LAST_REPLENISHED: 'Replenished', NEVER_REPLENISHED: 'Not replenished yet', NEEDS_REPLENISHING: 'Needs replenishing' },
    });
  });

  afterEach(() => vi.useRealTimers());

  it('should show when it was last replenished, the location and the note', async () => {
    await create(place, '2026-10-20T12:00:00.000Z');

    expect(element().querySelector('time')?.getAttribute('datetime')).toBe(place.lastReplenishedAt);
    expect(element().textContent).not.toContain('Needs replenishing');
    expect(element().querySelector('app-event-map')).not.toBeNull();
    expect(element().textContent).toContain('49.72550, 13.94420');
    expect(element().querySelector('.view-note')?.textContent).toBe('Feeder by the big clearing');
  });

  it('should say when it needs replenishing during the feeding season', async () => {
    await create({ ...place, lastReplenishedAt: null }, '2026-10-20T12:00:00.000Z');

    expect(element().textContent).toContain('Not replenished yet');
    expect(element().textContent).toContain('Needs replenishing');
  });

  it('should leave out what was not given', async () => {
    await create({ ...place, location: null, note: '' }, '2026-07-01T12:00:00.000Z');

    expect(element().querySelector('app-event-map')).toBeNull();
    expect(element().querySelector('.view-note')).toBeNull();
    expect(element().textContent).not.toContain('Needs replenishing');
  });
});
