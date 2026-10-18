import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { FeedingPlace } from '../model/feeding-place';
import { FeedingActions } from '../state/feeding/feeding.actions';
import { FeedingState, initialState as feedingInitialState } from '../state/feeding/feeding.reducer';
import { LocationActions } from '../state/location/location.actions';
import { LocationState } from '../state/location/location.model';
import { initialState as locationInitialState } from '../state/location/location.reducer';
import { FeedingPlaceForm } from './feeding-place-form';

describe('FeedingPlaceForm', () => {
  let fixture: ComponentFixture<FeedingPlaceForm>;
  let component: FeedingPlaceForm;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const element = () => fixture.nativeElement as HTMLElement;
  const typeSelect = () => element().querySelector('#feeding-place-type') as HTMLSelectElement;
  const noteInput = () => element().querySelector('#feeding-place-note') as HTMLTextAreaElement;
  const submitButton = () => element().querySelector('button[type="submit"]') as HTMLButtonElement;
  const chooseType = async (value: string) => {
    typeSelect().value = value;
    typeSelect().dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const setState = async (state: { feeding?: Partial<FeedingState>; location?: Partial<LocationState> }) => {
    store.setState({
      feeding: { ...feedingInitialState, ...state.feeding },
      location: { ...locationInitialState, ...state.location },
    });
    await fixture.whenStable();
  };
  const create = async (place: FeedingPlace | null) => {
    fixture = TestBed.createComponent(FeedingPlaceForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('place', place);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedingPlaceForm],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({ initialState: { feeding: feedingInitialState, location: locationInitialState } }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      FEEDING: {
        TYPES: { feeding: 'Feeding', 'salt-lick': 'Salt lick' },
        FORM: { TYPE_PLACEHOLDER: 'Select feeder or salt lick', SAVE_FAILED: 'Failed' },
      },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
  });

  describe('adding a place', () => {
    beforeEach(() => create(null));

    it('should offer the feeding place types and request the current location', () => {
      const options = Array.from(typeSelect().options);

      expect(options.map((option) => option.value)).toEqual(['', 'feeding', 'feed-pile', 'bait-site', 'salt-lick']);
      expect(options[0].textContent?.trim()).toBe('Select feeder or salt lick');
      expect(dispatch).toHaveBeenCalledWith(LocationActions.locate());
    });

    it('should ask for no date', async () => {
      await chooseType('feeding');

      expect(element().querySelector('input[type="datetime-local"]')).toBeNull();
    });

    it('should save the type, location and note without any date', async () => {
      await setState({ location: { status: 'located', position: { latitude: 49, longitude: 13.5, accuracy: 5 } } });
      await chooseType('salt-lick');
      noteInput().value = '  By the oak  ';
      noteInput().dispatchEvent(new Event('input'));
      await fixture.whenStable();
      dispatch.mockClear();

      submitButton().click();

      expect(dispatch).toHaveBeenCalledWith(
        FeedingActions.addPlace({
          place: {
            type: 'salt-lick',
            location: { latitude: 49, longitude: 13.5 },
            note: 'By the oak',
            photoId: null,
            lastReplenishedAt: null,
          },
        }),
      );
    });

    it('should show an error when saving failed', async () => {
      await chooseType('feeding');

      await setState({ feeding: { saveError: 'QuotaExceededError' } });

      expect(element().querySelector('[role="alert"]')?.textContent).toContain('Failed');
    });
  });

  describe('editing a place', () => {
    const existing: FeedingPlace = {
      id: 'a',
      type: 'feeding',
      location: { latitude: 49, longitude: 13.5 },
      note: 'Hay rack',
      photoId: 'photo-1',
      lastReplenishedAt: '2026-10-01T06:30:00.000Z',
    };

    beforeEach(() => create(existing));

    it('should prefill the place and keep its location', () => {
      expect(typeSelect().value).toBe('feeding');
      expect(noteInput().value).toBe('Hay rack');
      expect(component.location()).toEqual(existing.location);
      expect(dispatch).not.toHaveBeenCalledWith(LocationActions.locate());
    });

    it('should update the place, keeping its id, photo and last replenishment', async () => {
      await chooseType('salt-lick');

      submitButton().click();

      expect(dispatch).toHaveBeenCalledWith(FeedingActions.updatePlace({ place: { ...existing, type: 'salt-lick' } }));
    });
  });
});
