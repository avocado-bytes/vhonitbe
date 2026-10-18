import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { FeedingPlace } from '../model/feeding-place';
import { FeedingActions } from '../state/feeding/feeding.actions';
import { initialState } from '../state/feeding/feeding.reducer';
import { FeedingPlaceList } from './feeding-place-list';

describe('FeedingPlaceList', () => {
  let fixture: ComponentFixture<FeedingPlaceList>;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const places: FeedingPlace[] = [
    { id: 'a', type: 'feeding', location: { latitude: 49, longitude: 13.5 }, note: 'Hay rack', photoId: null },
    { id: 'b', type: 'salt-lick', location: null, note: '', photoId: null },
  ];
  const element = () => fixture.nativeElement as HTMLElement;
  const rows = () => Array.from(element().querySelectorAll('li.place'));
  const action = (row: Element, label: string) => row.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedingPlaceList],
      providers: [provideTranslateService({ lang: 'en' }), provideMockStore({ initialState: { feeding: initialState } })],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      FEEDING: { TYPES: { feeding: 'Feeding', 'salt-lick': 'Salt lick' }, DELETE_CONFIRM: 'Delete this place?' },
      OVERVIEW: { SHARE: 'Share', EDIT: 'Edit', DELETE: 'Delete', SHOW_ON_MAP: 'Show on map' },
    });
    dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
    fixture = TestBed.createComponent(FeedingPlaceList);
    fixture.componentRef.setInput('places', places);
    await fixture.whenStable();
  });

  it('should list each place with its type, position and note but no date', () => {
    expect(rows()).toHaveLength(2);
    expect(rows()[0].textContent).toContain('Feeding');
    expect(rows()[0].textContent).toContain('49.00000, 13.50000');
    expect(rows()[0].textContent).toContain('Hay rack');
    expect(rows()[1].textContent).toContain('Salt lick');
    expect(element().querySelector('li.place time')).toBeNull();
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
