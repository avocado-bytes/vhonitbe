import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { FeedingPlace } from '../model/feeding-place';
import { FeedingActions } from '../state/feeding/feeding.actions';
import { FeedingState, initialState } from '../state/feeding/feeding.reducer';
import { FeedingPlaceList } from './feeding-place-list';

describe('FeedingPlaceList', () => {
  let fixture: ComponentFixture<FeedingPlaceList>;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const places: FeedingPlace[] = [
    { id: 'a', type: 'feeding', location: { latitude: 49, longitude: 13.5 }, note: 'Hay rack', photoId: null },
    { id: 'b', type: 'salt-lick', location: null, note: '', photoId: null, lastReplenishedAt: '2026-10-19T08:00:00.000Z' },
  ];
  const feeding: FeedingState = { ...initialState, settings: { seasonStart: 10, seasonEnd: 3, replenishDays: 5 } };
  const element = () => fixture.nativeElement as HTMLElement;
  const rows = () => Array.from(element().querySelectorAll('li.place'));
  const action = (row: Element, label: string) => row.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

  beforeEach(async () => {
    vi.useFakeTimers({ now: new Date('2026-10-20T12:00:00.000Z'), toFake: ['Date', 'setInterval', 'clearInterval'] });
    await TestBed.configureTestingModule({
      imports: [FeedingPlaceList],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({ initialState: { feeding, settings: { theme: 'light', language: 'en' } } }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      FEEDING: {
        TYPES: { feeding: 'Feeding', 'salt-lick': 'Salt lick' },
        DELETE_CONFIRM: 'Delete this place?',
        REPLENISHED: 'Replenished',
        LAST_REPLENISHED: 'Replenished',
        NEVER_REPLENISHED: 'Not replenished yet',
        NEEDS_REPLENISHING: 'Needs replenishing',
      },
      OVERVIEW: { SHARE: 'Share', EDIT: 'Edit', DELETE: 'Delete', SHOW_ON_MAP: 'Show on map' },
    });
    dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
    fixture = TestBed.createComponent(FeedingPlaceList);
    fixture.componentRef.setInput('places', places);
    await fixture.whenStable();
  });

  afterEach(() => vi.useRealTimers());

  it('should list each place with its type, position, note and last replenishment', () => {
    expect(rows()).toHaveLength(2);
    expect(rows()[0].textContent).toContain('Feeding');
    expect(rows()[0].textContent).toContain('49.00000, 13.50000');
    expect(rows()[0].textContent).toContain('Hay rack');
    expect(rows()[0].textContent).toContain('Not replenished yet');
    expect(rows()[1].textContent).toContain('Salt lick');
    expect(rows()[1].querySelector('time')?.getAttribute('datetime')).toBe('2026-10-19T08:00:00.000Z');
  });

  it('should mark a place never replenished or replenished too long ago', async () => {
    expect(rows()[0].classList).toContain('needs-replenishing');
    expect(rows()[0].textContent).toContain('Needs replenishing');
    expect(rows()[1].classList).not.toContain('needs-replenishing');

    // Five days after the last replenishment the place becomes due on its own
    vi.setSystemTime(new Date('2026-10-24T08:01:00.000Z'));
    vi.advanceTimersByTime(60_000);
    await fixture.whenStable();

    expect(rows()[1].classList).toContain('needs-replenishing');
  });

  it('should mark a place as replenished from its actions', () => {
    action(rows()[0], 'Replenished').click();

    expect(dispatch).toHaveBeenCalledWith(FeedingActions.replenishPlace({ place: places[0] }));
  });

  it('should offer the map only for a place with a location', () => {
    expect(action(rows()[0], 'Show on map')).not.toBeNull();
    expect(action(rows()[1], 'Show on map')).toBeNull();
  });

  it('should share and edit a place', () => {
    action(rows()[1], 'Share').click();
    action(rows()[0], 'Edit').click();

    expect(dispatch).toHaveBeenCalledWith(FeedingActions.sharePlace({ place: places[1] }));
    expect(dispatch).toHaveBeenCalledWith(FeedingActions.startEdit({ place: places[0] }));
  });

  it('should delete a place only once confirmed', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    action(rows()[0], 'Delete').click();
    expect(dispatch).not.toHaveBeenCalled();

    action(rows()[0], 'Delete').click();
    expect(confirm).toHaveBeenCalledWith('Delete this place?');
    expect(dispatch).toHaveBeenCalledWith(FeedingActions.deletePlace({ id: 'a' }));
    confirm.mockRestore();
  });
});
