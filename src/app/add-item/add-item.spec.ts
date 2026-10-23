import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { Ammunition } from '../model/ammunition';
import { HuntingEvent } from '../model/event';
import { Firearm } from '../model/firearm';
import { ANIMAL_GROUPS, GAME_BIRDS, GAME_MAMMALS, ITEMS, REGULATED_SPECIES } from '../model/item';
import { AmmunitionActions } from '../state/ammunition/ammunition.actions';
import { EventsActions } from '../state/events/events.actions';
import { FirearmsActions } from '../state/firearms/firearms.actions';
import { AmmunitionState, initialState as ammunitionInitialState } from '../state/ammunition/ammunition.reducer';
import { EventsState, initialState as eventsInitialState } from '../state/events/events.reducer';
import { FirearmsState, initialState as firearmsInitialState } from '../state/firearms/firearms.reducer';
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
  const sexSelect = () => element().querySelector('#add-item-sex') as HTMLSelectElement;
  const herdSizeInput = () => element().querySelector('#add-item-herd-size') as HTMLInputElement;
  const herdCheckbox = () => element().querySelector('#add-item-herd') as HTMLInputElement;
  const tagInput = () => element().querySelector('#add-item-tag-number') as HTMLInputElement;
  const enterTag = async (value: string) => {
    tagInput().value = value;
    tagInput().dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
    await fixture.whenStable();
  };
  const submitButton = () => element().querySelector('button[type="submit"]') as HTMLButtonElement;
  const dateInput = () => element().querySelector('#add-item-occurred-at') as HTMLInputElement;
  const noteInput = () => element().querySelector('#add-item-note') as HTMLTextAreaElement;
  const picker = () => element().querySelector('app-location-picker');
  const enterNote = async (value: string) => {
    noteInput().value = value;
    noteInput().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const enterHerdSize = async (value: string) => {
    herdSizeInput().value = value;
    herdSizeInput().dispatchEvent(new Event('input'));
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
  const setState = async (state: {
    events?: Partial<EventsState>;
    location?: Partial<LocationState>;
    firearms?: Partial<FirearmsState>;
    ammunition?: Partial<AmmunitionState>;
  }) => {
    store.setState({
      events: { ...eventsInitialState, ...state.events },
      location: { ...locationInitialState, ...state.location },
      firearms: { ...firearmsInitialState, ...state.firearms },
      ammunition: { ...ammunitionInitialState, ...state.ammunition },
      settings: { theme: 'light', language: 'en' },
    });
    await fixture.whenStable();
  };

  beforeEach(async () => {
    actions$ = new Subject<Action>();
    await TestBed.configureTestingModule({
      imports: [AddItem],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({
          initialState: {
            events: eventsInitialState,
            location: locationInitialState,
            firearms: firearmsInitialState,
            ammunition: ammunitionInitialState,
            settings: { theme: 'light', language: 'en' },
          },
        }),
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
        NOT_GIVEN: 'Not given',
        RETURN_TO_POSITION: 'Back to my position',
        AS_RECORDED: '{{label}} (as recorded)',
        ADD_SHOOTER_POSITION: "Add shooter's position",
        SHOT_DISTANCE: 'Shooting distance',
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

  describe('photo', () => {
    it('should offer taking a photo with the camera and choosing one from the gallery', async () => {
      await choose(typeSelect(), 'spotting');
      const camera = element().querySelector('#add-item-photo') as HTMLInputElement;
      const gallery = element().querySelector('#add-item-gallery') as HTMLInputElement;

      expect(camera.getAttribute('capture')).toBe('environment');
      expect(gallery.type).toBe('file');
      expect(gallery.accept).toBe('image/*');
      // Without capture, phones offer their gallery instead of opening the camera
      expect(gallery.hasAttribute('capture')).toBe(false);
      expect(element().querySelector('label[for="add-item-gallery"]')).not.toBeNull();
    });
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

  it('should only show the other fields once an event type is selected', async () => {
    expect(animalSelect()).toBeNull();
    expect(dateInput()).toBeNull();
    expect(noteInput()).toBeNull();
    expect(submitButton()).toBeNull();

    await choose(typeSelect(), 'tracks');

    expect(dateInput()).not.toBeNull();
    expect(noteInput()).not.toBeNull();
    expect(submitButton()).not.toBeNull();
  });

  describe('animal', () => {
    beforeEach(async () => {
      await choose(typeSelect(), 'spotting');
    });

    it('should be hidden for event types without an animal', async () => {
      expect(animalSelect()).not.toBeNull();

      await choose(typeSelect(), 'hunting-stand');

      expect(animalSelect()).toBeNull();
    });

    it('should not store an animal chosen before switching to a type without one', async () => {
      await choose(animalSelect(), 'roe-deer');
      await choose(typeSelect(), 'hunting-stand');
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.animal).toBeNull();
    });

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

  describe('sex', () => {
    it('should be optional and offered only for event types with an animal', async () => {
      await choose(typeSelect(), 'harvest');
      expect(Array.from(sexSelect().options).map((option) => option.value)).toEqual(['', 'male', 'female']);
      expect(sexSelect().value).toBe('');

      await choose(typeSelect(), 'hunting-stand');

      expect(sexSelect()).toBeNull();
    });

    it('should store the selected sex', async () => {
      await choose(typeSelect(), 'harvest');
      await choose(sexSelect(), 'female');
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.sex).toBe('female');
    });

    it('should not store a sex chosen before switching to a type without an animal', async () => {
      await choose(typeSelect(), 'harvest');
      await choose(sexSelect(), 'male');
      await choose(typeSelect(), 'trail-camera');
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.sex).toBeNull();
    });
  });

  describe('herd', () => {
    const check = async (checked: boolean) => {
      herdCheckbox().checked = checked;
      herdCheckbox().dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };

    it('should only be offered for sightings, unchecked by default', async () => {
      await choose(typeSelect(), 'harvest');
      expect(herdCheckbox()).toBeNull();

      await choose(typeSelect(), 'spotting');

      expect(herdCheckbox().checked).toBe(false);
    });

    it('should store whether a sighting was of a herd', async () => {
      await choose(typeSelect(), 'spotting');
      await check(true);
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.herd).toBe(true);
    });

    it('should ask for the number of animals only for a herd', async () => {
      await choose(typeSelect(), 'spotting');
      expect(herdSizeInput()).toBeNull();

      await check(true);

      expect(herdSizeInput()).not.toBeNull();
      expect(herdSizeInput().value).toBe('');
    });

    it('should store the number of animals in the herd', async () => {
      await choose(typeSelect(), 'spotting');
      await check(true);
      await enterHerdSize('7');
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.herdSize).toBe(7);
    });

    it('should reject a number of animals below two or not whole', async () => {
      await choose(typeSelect(), 'spotting');
      await check(true);

      for (const value of ['1', '2.5']) {
        await enterHerdSize(value);
        expect(submitButton().disabled).toBe(true);
        expect(herdSizeInput().classList).toContain('is-invalid');
      }

      await enterHerdSize('2');
      expect(submitButton().disabled).toBe(false);
    });

    it('should drop the number of animals when the sighting is no longer a herd', async () => {
      await choose(typeSelect(), 'spotting');
      await check(true);
      await enterHerdSize('1');
      await check(false);
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.herdSize).toBeNull();
    });

    it('should offer mixed sex only for a herd', async () => {
      await choose(typeSelect(), 'spotting');
      expect(Array.from(sexSelect().options).map((option) => option.value)).not.toContain('mixed');

      await check(true);

      expect(Array.from(sexSelect().options).map((option) => option.value)).toEqual(['', 'male', 'female', 'mixed']);
    });

    it('should not store mixed sex once the sighting is no longer a herd', async () => {
      await choose(typeSelect(), 'spotting');
      await check(true);
      await choose(sexSelect(), 'mixed');
      await check(false);
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.sex).toBeNull();
    });

    it('should not store a herd for other event types', async () => {
      await choose(typeSelect(), 'spotting');
      await check(true);
      await choose(typeSelect(), 'tracks');
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.herd).toBe(false);
    });
  });

  describe('tag number', () => {
    it('should only be asked for harvested hoofed game', async () => {
      await choose(typeSelect(), 'harvest');
      expect(tagInput()).toBeNull();

      await choose(animalSelect(), 'roe-deer');
      expect(tagInput()).not.toBeNull();

      await choose(animalSelect(), 'mallard');
      expect(tagInput()).toBeNull();

      await choose(animalSelect(), 'red-fox');
      expect(tagInput()).toBeNull();

      await choose(animalSelect(), 'raccoon');
      expect(tagInput()).toBeNull();

      await choose(animalSelect(), 'wild-boar');
      expect(tagInput()).not.toBeNull();

      await choose(typeSelect(), 'spotting');
      expect(tagInput()).toBeNull();
    });

    it('should store the digits of the tag number', async () => {
      await choose(typeSelect(), 'harvest');
      await choose(animalSelect(), 'roe-deer');
      await enterTag('12 345678');
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.tagNumber).toBe('12345678');
    });

    it('should block saving an incomplete tag number and point it out once the field is left', async () => {
      await choose(typeSelect(), 'harvest');
      await choose(animalSelect(), 'roe-deer');
      await enterTag('12 345');

      expect(submitButton().disabled).toBe(true);
      expect(tagInput().classList).not.toContain('is-invalid');

      tagInput().dispatchEvent(new Event('blur'));
      await fixture.whenStable();

      expect(tagInput().classList).toContain('is-invalid');
    });

    it('should not store a tag number once the animal is no longer hoofed game', async () => {
      await choose(typeSelect(), 'harvest');
      await choose(animalSelect(), 'roe-deer');
      await enterTag('12345678');
      await choose(animalSelect(), 'mallard');
      dispatch.mockClear();

      submitButton().click();

      const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>;
      expect(event.tagNumber).toBeNull();
    });
  });

  describe('date and time', () => {
    beforeEach(async () => {
      await choose(typeSelect(), 'tracks');
    });

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
    beforeEach(async () => {
      await choose(typeSelect(), 'tracks');
    });

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
    it('should be enabled once an event type is selected', async () => {
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
        herd: false,
        herdSize: null,
        sex: null,
        tagNumber: null,
        firearm: null,
        ammunition: null,
        location: { latitude: 49.0, longitude: 13.5 },
        shooterLocation: null,
        shotDistance: null,
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
      await choose(typeSelect(), 'tracks');
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
    herd: false,
    herdSize: null,
    sex: 'male',
    tagNumber: '12345678',
    firearm: null,
    ammunition: null,
    location: { latitude: 49, longitude: 13.5 },
    shooterLocation: null,
    shotDistance: null,
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
      expect(sexSelect().value).toBe('male');
      expect(tagInput().value).toBe('12 345678');
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
        EventsActions.updateEvent({ event: { ...existing, type: 'spotting', animal: 'roe-deer', tagNumber: null } }),
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

  describe("shooter's position", () => {
    const addButton = () =>
      Array.from(element().querySelectorAll('button')).find((button) => button.textContent?.includes("Add shooter's position"));
    const latitudeInput = () => element().querySelector('#add-item-shooter-latitude') as HTMLInputElement;
    const longitudeInput = () => element().querySelector('#add-item-shooter-longitude') as HTMLInputElement;
    const enterCoordinate = async (input: HTMLInputElement, value: string) => {
      input.value = value;
      input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
      input.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    };
    const submitted = () => {
      dispatch.mockClear();
      submitButton().click();
      return (dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>).event;
    };

    beforeEach(() => setState({ location: { status: 'located', position: { latitude: 49, longitude: 13.5, accuracy: 20 } } }));

    it('should only be offered for a harvest', async () => {
      await choose(typeSelect(), 'spotting');
      expect(addButton()).toBeUndefined();

      await choose(typeSelect(), 'harvest');
      expect(addButton()).toBeDefined();
      expect(latitudeInput()).toBeNull();
    });

    it('should start at the location of the harvest, with a second map and the coordinates to type', async () => {
      await choose(typeSelect(), 'harvest');
      addButton()!.click();
      await fixture.whenStable();

      expect(component.shooterLocation()).toEqual({ latitude: 49, longitude: 13.5 });
      expect(element().querySelectorAll('app-location-picker').length).toBe(2);
      expect(latitudeInput().value).toBe('49.000000');
      expect(longitudeInput().value).toBe('13.500000');
    });

    it('should save the typed position and the shooting distance in meters', async () => {
      await choose(typeSelect(), 'harvest');
      addButton()!.click();
      await fixture.whenStable();

      await enterCoordinate(latitudeInput(), '49.001');

      expect(component.shooterLocation()).toEqual({ latitude: 49.001, longitude: 13.5 });
      expect(element().textContent).toContain('Shooting distance: 111 m');
      const event = submitted();
      expect(event.shooterLocation).toEqual({ latitude: 49.001, longitude: 13.5 });
      expect(event.shotDistance).toBe(111);
    });

    it('should take both coordinates pasted into either field', async () => {
      await choose(typeSelect(), 'harvest');
      addButton()!.click();
      await fixture.whenStable();

      const paste = new Event('paste', { cancelable: true });
      Object.defineProperty(paste, 'clipboardData', { value: { getData: () => '49.002, 13.5' } });
      longitudeInput().dispatchEvent(paste);
      await fixture.whenStable();

      expect(component.shooterLocation()).toEqual({ latitude: 49.002, longitude: 13.5 });
      expect(latitudeInput().value).toBe('49.002000');
    });

    it('should not save an invalid typed coordinate', async () => {
      await choose(typeSelect(), 'harvest');
      addButton()!.click();
      await fixture.whenStable();

      await enterCoordinate(longitudeInput(), '');

      expect(submitButton().disabled).toBe(true);
    });

    it('should drop the position when removed or when the type no longer has one', async () => {
      await choose(typeSelect(), 'harvest');
      addButton()!.click();
      await fixture.whenStable();

      await choose(typeSelect(), 'wounded-game');
      expect(submitted()).toEqual(expect.objectContaining({ shooterLocation: null, shotDistance: null }));

      await choose(typeSelect(), 'harvest');
      (element().querySelector('button.btn-outline-danger') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect(addButton()).toBeDefined();
      expect(submitted()).toEqual(expect.objectContaining({ shooterLocation: null, shotDistance: null }));
    });
  });

  describe('firearm and ammunition', () => {
    const firearm: Firearm = { id: 'g1', name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope', opticsModel: 'Zeiss V8', suppressed: true, barrelLength: 560 };
    const cartridge: Ammunition = {
      id: 'a1',
      caliber: '.308 Win',
      source: 'factory',
      bulletWeight: 165,
      muzzleVelocity: 820,
      bulletType: 'Soft point (SP)',
      ballisticCoefficient: 0.447,
      primer: '',
      powder: '',
      brass: '',
      brassFirings: null,
      product: 'RWS EVO',
    };
    const { id: _firearmId, ...firearmCopy } = firearm;
    const { id: _ammunitionId, ...ammunitionCopy } = cartridge;
    const firearmSelect = () => element().querySelector('#add-item-firearm') as HTMLSelectElement;
    const ammunitionSelect = () => element().querySelector('#add-item-ammunition') as HTMLSelectElement;
    const options = (select: HTMLSelectElement) => Array.from(select.options).map((option) => option.textContent?.trim());
    const submitted = () => {
      dispatch.mockClear();
      submitButton().click();
      return (dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.addEvent>).event;
    };

    beforeEach(() => setState({ firearms: { firearms: [firearm] }, ammunition: { ammunition: [cartridge] } }));

    it('should load the saved firearms and ammunition to choose from', () => {
      expect(dispatch).toHaveBeenCalledWith(FirearmsActions.load());
      expect(dispatch).toHaveBeenCalledWith(AmmunitionActions.load());
    });

    it('should offer only the saved firearms and ammunition, and only for a harvest', async () => {
      await choose(typeSelect(), 'spotting');
      expect(firearmSelect()).toBeNull();

      await choose(typeSelect(), 'harvest');
      expect(options(firearmSelect())).toEqual(['Not given', 'Blaser R8 (.308 Win)']);
      expect(options(ammunitionSelect())).toEqual(['Not given', '.308 Win · RWS EVO · 165 gr']);
      expect(firearmSelect().value).toBe('');
    });

    it('should copy the chosen firearm and ammunition into the harvest, without their ids', async () => {
      await choose(typeSelect(), 'harvest');
      await choose(firearmSelect(), 'g1');
      await choose(ammunitionSelect(), 'a1');

      const event = submitted();

      expect(event.firearm).toEqual(firearmCopy);
      expect(event.ammunition).toEqual(ammunitionCopy);
      // A copy rather than the stored object, so it keeps its state when the firearm is changed later
      expect(event.firearm).not.toBe(firearm);
    });

    it('should store none when not given, and drop a choice made before switching to another type', async () => {
      await choose(typeSelect(), 'harvest');
      expect(submitted().firearm).toBeNull();

      await choose(firearmSelect(), 'g1');
      await choose(typeSelect(), 'tracks');
      const event = submitted();
      expect(event.firearm).toBeNull();
      expect(event.ammunition).toBeNull();
    });

    describe('editing a harvest', () => {
      const recordedFirearm = { ...firearmCopy, opticsModel: 'Swarovski Z8i' };
      const harvest: HuntingEvent = {
        id: 'e1',
        type: 'harvest',
        animal: 'wild-boar',
        location: null,
        note: '',
        firearm: recordedFirearm,
        ammunition: null,
        occurredAt: '2026-10-01T06:30:00.000Z',
        createdAt: '2026-10-01T06:31:00.000Z',
        updatedAt: '2026-10-01T06:31:00.000Z',
      };

      beforeEach(async () => {
        fixture = TestBed.createComponent(AddItem);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('event', harvest);
        await fixture.whenStable();
      });

      it('should offer and keep the firearm as recorded, even though the saved one has changed since', () => {
        expect(firearmSelect().value).toBe('recorded');
        expect(options(firearmSelect())).toEqual(['Not given', 'Blaser R8 (.308 Win) (as recorded)', 'Blaser R8 (.308 Win)']);
        expect(ammunitionSelect().value).toBe('');

        dispatch.mockClear();
        submitButton().click();

        const { event } = dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.updateEvent>;
        expect(event.firearm).toEqual(recordedFirearm);
      });

      it('should keep the recorded firearm when it is no longer saved', async () => {
        await setState({ firearms: { firearms: [] } });

        expect(firearmSelect().value).toBe('recorded');
        dispatch.mockClear();
        submitButton().click();
        expect((dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.updateEvent>).event.firearm).toEqual(recordedFirearm);
      });

      it('should copy the saved firearm as it is now when chosen instead', async () => {
        await choose(firearmSelect(), 'g1');
        dispatch.mockClear();
        submitButton().click();

        expect((dispatch.mock.calls[0][0] as ReturnType<typeof EventsActions.updateEvent>).event.firearm).toEqual(firearmCopy);
      });
    });
  });

  describe('returning to the user\'s position', () => {
    const here = { latitude: 49.0, longitude: 13.5, accuracy: 5 };
    const returnButton = () =>
      Array.from(element().querySelectorAll('button')).find((button) => button.textContent?.includes('Back to my position'));

    beforeEach(async () => {
      await choose(typeSelect(), 'spotting');
      await setState({ location: { status: 'located', position: here } });
    });

    it('should not be offered while a new event is at the user\'s position', () => {
      expect(component.location()).toEqual({ latitude: 49.0, longitude: 13.5 });
      expect(returnButton()).toBeUndefined();
    });

    it('should be offered once the location was moved, and move it back to the user\'s position', async () => {
      component.location.set({ latitude: 49.01, longitude: 13.52 });
      await fixture.whenStable();

      returnButton()!.click();
      await fixture.whenStable();

      expect(component.location()).toEqual({ latitude: 49.0, longitude: 13.5 });
      expect(returnButton()).toBeUndefined();
    });

    it('should return to where the device is now, after it has moved', async () => {
      component.location.set({ latitude: 49.01, longitude: 13.52 });
      await setState({ location: { status: 'located', position: { latitude: 49.002, longitude: 13.503, accuracy: 5 } } });

      returnButton()!.click();

      expect(component.location()).toEqual({ latitude: 49.002, longitude: 13.503 });
    });

    it('should be offered for an event added at a point on the map', async () => {
      fixture = TestBed.createComponent(AddItem);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('initialLocation', { latitude: 49.05, longitude: 13.6 });
      await fixture.whenStable();
      await choose(typeSelect(), 'spotting');

      expect(returnButton()).toBeDefined();
    });

    it('should not be offered when editing an event, which keeps its recorded location', async () => {
      fixture = TestBed.createComponent(AddItem);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('event', {
        id: 'e1',
        type: 'spotting',
        animal: null,
        location: { latitude: 49.05, longitude: 13.6 },
        note: '',
        occurredAt: '2026-10-01T06:30:00.000Z',
        createdAt: '2026-10-01T06:31:00.000Z',
        updatedAt: '2026-10-01T06:31:00.000Z',
      } satisfies HuntingEvent);
      await fixture.whenStable();

      expect(returnButton()).toBeUndefined();
    });
  });
});
