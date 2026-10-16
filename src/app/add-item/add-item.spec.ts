import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { HuntingEvent } from '../model/event';
import { ANIMAL_GROUPS, GAME_BIRDS, GAME_MAMMALS, ITEMS, REGULATED_SPECIES } from '../model/item';
import { EventsActions } from '../state/events/events.actions';
import { EventsState, initialState as eventsInitialState } from '../state/events/events.reducer';
import { LocationActions } from '../state/location/location.actions';
import { LocationState } from '../state/location/location.model';
import { initialState as locationInitialState } from '../state/location/location.reducer';
import { fromDateTimeLocal, toDateTimeLocal } from '../shared/datetime-local';
import { AddItem } from './add-item';

describe('AddItem', () => {
  let component: AddItem;
  let fixture: ComponentFixture<AddItem>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;
  let actions$: Subject<Action>;

  const element = () => fixture.nativeElement as HTMLElement;
  const typeSelect = () => element().querySelector('#add-item-type') as HTMLSelectElement;
  const animalSelect = () => element().querySelector('#add-item-animal') as HTMLSelectElement;
  const submitButton = () => element().querySelector('button[type="submit"]') as HTMLButtonElement;
  const dateInput = () => element().querySelector('#add-item-occurred-at') as HTMLInputElement;
  const noteInput = () => element().querySelector('#add-item-note') as HTMLTextAreaElement;
  const picker = () => element().querySelector('app-location-picker');
  const enterNote = async (value: string) => {
    noteInput().value = value;
    noteInput().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const enterDate = async (value: string) => {
    dateInput().value = value;
    dateInput().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const choose = async (select: HTMLSelectElement, value: string) => {
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const setState = async (state: { events?: Partial<EventsState>; location?: Partial<LocationState> }) => {
    store.setState({
      events: { ...eventsInitialState, ...state.events },
      location: { ...locationInitialState, ...state.location },
    });
    await fixture.whenStable();
  };

  beforeEach(async () => {
    actions$ = new Subject<Action>();
    await TestBed.configureTestingModule({
      imports: [AddItem],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({ initialState: { events: eventsInitialState, location: locationInitialState } }),
        provideMockActions(() => actions$),
      ],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('en', {
      ADD_ITEM: {
        TYPE_PLACEHOLDER: 'Select event type',
        ANIMAL_PLACEHOLDER: 'Select animal',
        SUBMIT: 'Save',
        SAVE_FAILED: 'Failed',
        FUTURE_DATE: 'No future dates',
        NO_LOCATION: 'No location recorded',
        LOCATION_UNAVAILABLE: 'Location unavailable',
      },
      MAP: { LOCATING: 'Finding your location…' },
      ITEMS: { spotting: 'Sighting', tracks: 'Tracks' },
      ANIMAL_GROUPS: { 'game-mammals': 'Game mammals', 'game-birds': 'Game birds', 'regulated-species': 'Regulated' },
      ANIMALS: { 'roe-deer': 'Roe deer' },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(AddItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request the current location when opened', () => {
    expect(dispatch).toHaveBeenCalledWith(LocationActions.locate());
  });

  describe('event type', () => {
    it('should offer every item type with a placeholder selected by default', () => {
      const options = Array.from(typeSelect().options);

      expect(options.map((option) => option.value)).toEqual(['', ...ITEMS]);
      expect(options[0].textContent?.trim()).toBe('Select event type');
      expect(options[1].textContent?.trim()).toBe('Sighting');
      expect(typeSelect().value).toBe('');
      expect(component.type()).toBeNull();
    });

    it('should update the selected type', async () => {
      await choose(typeSelect(), 'harvest');

      expect(component.type()).toBe('harvest');
    });
  });

  describe('animal', () => {
    it('should group the animals in their declared order', () => {
      const groups = Array.from(animalSelect().querySelectorAll('optgroup'));

      expect(groups.map((group) => group.label)).toEqual(['Game mammals', 'Game birds', 'Regulated']);
      expect(groups.map((group) => Array.from(group.querySelectorAll('option')).map((option) => option.value))).toEqual(
        Object.values(ANIMAL_GROUPS),
      );
    });

    it('should offer every animal with a placeholder selected by default', () => {
      const values = Array.from(animalSelect().options).map((option) => option.value);

      expect(values).toEqual(['', ...GAME_MAMMALS, ...GAME_BIRDS, ...REGULATED_SPECIES]);
      expect(animalSelect().value).toBe('');
      expect(component.animal()).toBeNull();
    });

    it('should update the selected animal', async () => {
      await choose(animalSelect(), 'roe-deer');

      expect(component.animal()).toBe('roe-deer');
    });
  });

  describe('date and time', () => {
    it('should preselect the current date and time', () => {
      const shown = new Date(dateInput().value).getTime();

      expect(dateInput().type).toBe('datetime-local');
      expect(Math.abs(shown - Date.now())).toBeLessThan(60_000);
    });

    it('should disable submit when the date is cleared', async () => {
      await choose(typeSelect(), 'tracks');
      expect(submitButton().disabled).toBe(false);

      await enterDate('');

      expect(submitButton().disabled).toBe(true);
    });

    it('should not allow selecting a date in the future', () => {
      expect(dateInput().max).toBe(dateInput().value);
    });

    it('should reject a future date with a message', async () => {
      await choose(typeSelect(), 'tracks');
      const tomorrow = toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000));

      await enterDate(tomorrow);

      expect(submitButton().disabled).toBe(true);
      expect(dateInput().classList).toContain('is-invalid');
      expect(dateInput().getAttribute('aria-invalid')).toBe('true');
      dispatch.mockClear();
      element().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('should accept the date again once it is no longer in the future', async () => {
      await choose(typeSelect(), 'tracks');
      await enterDate(toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)));

      await enterDate('2026-10-03T05:45');

      expect(submitButton().disabled).toBe(false);
      expect(dateInput().classList).not.toContain('is-invalid');
    });

    it('should record the event at the entered date and time', async () => {
      await choose(typeSelect(), 'tracks');
      await enterDate('2026-10-03T05:45');
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.occurredAt).toBe(fromDateTimeLocal('2026-10-03T05:45'));
    });
  });

  describe('location', () => {
    it('should wait for the current location', () => {
      expect(picker()).toBeNull();
      expect(element().querySelector('[role="status"]')?.textContent).toContain('Finding your location…');
    });

    it('should explain when the location is not available', async () => {
      await setState({ location: { status: 'error', error: 'denied' } });

      expect(picker()).toBeNull();
      expect(element().textContent).toContain('Location unavailable');
    });

    it('should start the picker at the current location once it is known', async () => {
      await setState({ location: { status: 'located', position: { latitude: 49.0, longitude: 13.5, accuracy: 20 } } });

      expect(picker()).not.toBeNull();
      expect(component.location()).toEqual({ latitude: 49.0, longitude: 13.5 });
    });

    it('should not move an adjusted location when the current location updates', async () => {
      await setState({ location: { status: 'located', position: { latitude: 49.0, longitude: 13.5, accuracy: 20 } } });
      component.location.set({ latitude: 49.2, longitude: 13.7 });

      await setState({ location: { status: 'located', position: { latitude: 50.0, longitude: 14.0, accuracy: 5 } } });

      expect(component.location()).toEqual({ latitude: 49.2, longitude: 13.7 });
    });
  });

  describe('submit', () => {
    it('should be disabled until an event type is selected', async () => {
      expect(submitButton().disabled).toBe(true);

      await choose(typeSelect(), 'tracks');

      expect(submitButton().disabled).toBe(false);
    });

    it('should be disabled while saving', async () => {
      await choose(typeSelect(), 'tracks');
      await setState({ events: { saving: true } });

      expect(submitButton().disabled).toBe(true);
    });

    it('should dispatch addEvent with the selection, location and note', async () => {
      await setState({ location: { status: 'located', position: { latitude: 49.0, longitude: 13.5, accuracy: 20 } } });
      await choose(typeSelect(), 'harvest');
      await choose(animalSelect(), 'wild-boar');
      await enterNote('  Clean shot, 80 m  ');
      dispatch.mockClear();

      submitButton().click();

      expect(dispatch).toHaveBeenCalledTimes(1);
      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event).toEqual({
        type: 'harvest',
        animal: 'wild-boar',
        location: { latitude: 49.0, longitude: 13.5 },
        note: 'Clean shot, 80 m',
        occurredAt: expect.any(String),
      });
      expect(new Date(event.occurredAt).toISOString()).toBe(event.occurredAt);
    });

    it('should store no location and no animal when they are unknown', async () => {
      await choose(typeSelect(), 'poaching');
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.location).toBeNull();
      expect(event.animal).toBeNull();
    });

    it('should emit saved once the event has been persisted', () => {
      const saved = vi.fn();
      component.saved.subscribe(saved);
      const stored = { id: 'id-1' } as HuntingEvent;

      actions$.next(EventsActions.addEventSuccess({ event: stored }));

      expect(saved).toHaveBeenCalledWith(stored);
    });

    it('should show an error when saving failed', async () => {
      expect(element().querySelector('[role="alert"]')).toBeNull();

      await setState({ events: { saveError: 'QuotaExceededError' } });

      expect(element().querySelector('[role="alert"]')?.textContent).toContain('Failed');
    });
  });

  describe('editing an event', () => {
    const existing: HuntingEvent = {
    id: 'id-1',
    type: 'harvest',
    animal: 'wild-boar',
    location: { latitude: 49, longitude: 13.5 },
    note: 'Clean shot',
    occurredAt: '2026-10-01T06:30:00.000Z',
    createdAt: '2026-10-01T06:31:00.000Z',
    updatedAt: '2026-10-01T06:31:00.000Z',
  };

    beforeEach(async () => {
      dispatch.mockClear();
      fixture = TestBed.createComponent(AddItem);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('event', existing);
      await fixture.whenStable();
    });

    it('should prefill the selection and date from the event', () => {
      expect(typeSelect().value).toBe('harvest');
      expect(animalSelect().value).toBe('wild-boar');
      expect(dateInput().value).toBe(toDateTimeLocal(new Date(existing.occurredAt)));
      expect(submitButton().disabled).toBe(false);
    });

    it('should update the date when it was changed', async () => {
      await enterDate('2026-09-30T19:15');

      submitButton().click();

      expect(dispatch).toHaveBeenCalledWith(
        EventsActions.updateEvent({ event: { ...existing, occurredAt: fromDateTimeLocal('2026-09-30T19:15')! } }),
      );
    });

    it('should keep the recorded location instead of requesting a new one', async () => {
      await setState({ location: { status: 'located', position: { latitude: 50, longitude: 14, accuracy: 5 } } });

      expect(dispatch).not.toHaveBeenCalledWith(LocationActions.locate());
      expect(component.location()).toEqual(existing.location);
      expect(picker()).not.toBeNull();
    });

    it('should prefill the note', () => {
      expect(noteInput().value).toBe('Clean shot');
    });

    it('should update the location and note when they were changed', async () => {
      component.location.set({ latitude: 49.05, longitude: 13.55 });
      await enterNote('Two shots');

      submitButton().click();

      expect(dispatch).toHaveBeenCalledWith(
        EventsActions.updateEvent({
          event: { ...existing, location: { latitude: 49.05, longitude: 13.55 }, note: 'Two shots' },
        }),
      );
    });

    it('should say so when the event has no location', async () => {
      fixture.componentRef.setInput('event', { ...existing, location: null });
      await fixture.whenStable();

      expect(picker()).toBeNull();
      expect(element().textContent).toContain('No location recorded');
    });

    it('should dispatch updateEvent with the changes, keeping everything else', async () => {
      await setState({ location: { status: 'located', position: { latitude: 50, longitude: 14, accuracy: 5 } } });
      await choose(typeSelect(), 'spotting');
      await choose(animalSelect(), 'roe-deer');

      submitButton().click();

      expect(dispatch).toHaveBeenCalledWith(
        EventsActions.updateEvent({ event: { ...existing, type: 'spotting', animal: 'roe-deer' } }),
      );
      expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: EventsActions.addEvent.type }));
    });

    it('should emit saved once the update has been persisted', () => {
      const saved = vi.fn();
      component.saved.subscribe(saved);
      const updated = { ...existing, type: 'spotting' as const };

      actions$.next(EventsActions.updateEventSuccess({ event: updated }));

      expect(saved).toHaveBeenCalledWith(updated);
    });
  });
});
