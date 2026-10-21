import { Component, computed, effect, inject, input, linkedSignal, OnInit, output, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { ammunitionLabel } from '../model/ammunition';
import { AmmunitionSnapshot, FirearmSnapshot, GeoPoint, HuntingEvent, NewHuntingEvent, Sex, SEXES, snapshot } from '../model/event';
import { firearmLabel } from '../model/firearm';
import { Animal, ANIMAL_GROUPS, hasTagNumber, Item, itemHasAnimal, itemHasHerd, itemHasWeapon, ITEMS } from '../model/item';
import { LocationPicker } from '../location-picker/location-picker';
import { compressImage } from '../shared/compress-image';
import { TAG_DIGITS } from '../shared/tag-number';
import { TagNumberInput } from '../tag-number-input/tag-number-input';
import { fromDateTimeLocal, toDateTimeLocal } from '../shared/datetime-local';
import { EventStorage } from '../storage/event-storage';
import { AmmunitionActions } from '../state/ammunition/ammunition.actions';
import { selectSorted as selectSortedAmmunition } from '../state/ammunition/ammunition.reducer';
import { FirearmsActions } from '../state/firearms/firearms.actions';
import { selectSorted as selectSortedFirearms } from '../state/firearms/firearms.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';
import { EventsActions } from '../state/events/events.actions';
import { selectSaveError, selectSaving } from '../state/events/events.reducer';
import { LocationActions } from '../state/location/location.actions';
import { selectPosition, selectStatus } from '../state/location/location.reducer';

/** A herd has at least two animals */
const MIN_HERD_SIZE = 2;

/** The location picker rounds to about 10 cm, so a location this close is the user's position */
const POSITION_TOLERANCE = 1e-6;

/** The dropdown value of the firearm or ammunition copied into an edited event, as opposed to the id of a saved one */
const RECORDED = 'recorded';

@Component({
  imports: [TranslatePipe, KeyValuePipe, LocationPicker, TagNumberInput],
  selector: 'app-add-item',
  styleUrl: './add-item.scss',
  templateUrl: './add-item.html',
})
export class AddItem implements OnInit {
  private readonly store = inject(Store);
  private readonly storage = inject(EventStorage);

  protected readonly items = ITEMS;
  protected readonly minHerdSize = MIN_HERD_SIZE;
  protected readonly animalGroups = ANIMAL_GROUPS;
  /** Keeps the groups in their declared order instead of KeyValuePipe's alphabetical order */
  protected readonly keepOrder = () => 0;

  /** The event to edit; without it a new event is added */
  readonly event = input<HuntingEvent | null>(null);

  readonly type = linkedSignal<Item | null>(() => this.event()?.type ?? null);
  readonly animal = linkedSignal<Animal | null>(() => this.event()?.animal ?? null);
  /** The animal is only asked for, and stored, for types that concern one */
  protected readonly hasAnimal = computed(() => {
    const type = this.type();
    return type !== null && itemHasAnimal(type);
  });
  protected readonly hasHerd = computed(() => {
    const type = this.type();
    return type !== null && itemHasHerd(type);
  });
  readonly herd = linkedSignal<boolean>(() => this.event()?.herd ?? false);
  readonly sex = linkedSignal<Sex | null>(() => this.event()?.sex ?? null);
  /** The raw value of the herd size input; empty when not counted */
  readonly herdSize = linkedSignal<string>(() => this.event()?.herdSize?.toString() ?? '');
  /** Herd details only apply to a sighting marked as a herd */
  protected readonly isHerd = computed(() => this.hasHerd() && this.herd());
  protected readonly herdSizeInvalid = computed(() => {
    const value = this.herdSize().trim();
    return this.isHerd() && value !== '' && !(Number.isInteger(Number(value)) && Number(value) >= MIN_HERD_SIZE);
  });
  /** Mixed sex is only offered for a herd */
  protected readonly sexOptions = computed(() => (this.isHerd() ? SEXES : SEXES.filter((sex) => sex !== 'mixed')));
  protected readonly hasTagNumber = computed(() => {
    const type = this.type();
    return type !== null && this.hasAnimal() && hasTagNumber(type, this.animal());
  });
  /** The digits of the tag number entered so far */
  readonly tagNumber = linkedSignal<string>(() => this.event()?.tagNumber ?? '');
  /** The tag number is optional, but once started all its digits are needed */
  protected readonly tagNumberInvalid = computed(
    () => this.hasTagNumber() && this.tagNumber() !== '' && this.tagNumber().length !== TAG_DIGITS,
  );
  /** The user left the tag number field, so an incomplete number is pointed out */
  protected readonly tagNumberTouched = signal(false);
  protected readonly showTagNumberError = computed(() => this.tagNumberInvalid() && this.tagNumberTouched());
  /** A harvest records the firearm and ammunition used, chosen from the saved ones */
  protected readonly hasWeapon = computed(() => {
    const type = this.type();
    return type !== null && itemHasWeapon(type);
  });
  protected readonly firearms = this.store.selectSignal(selectSortedFirearms);
  protected readonly ammunitionOptions = this.store.selectSignal(selectSortedAmmunition);
  private readonly language = this.store.selectSignal(selectLanguage);
  private readonly numberFormat = computed(() => new Intl.NumberFormat(this.language(), { maximumFractionDigits: 3 }));
  protected readonly recorded = RECORDED;
  /** The chosen firearm: empty for none, RECORDED for the copy in an edited event, or the id of a saved firearm */
  readonly firearmChoice = linkedSignal<string>(() => (this.event()?.firearm ? RECORDED : ''));
  readonly ammunitionChoice = linkedSignal<string>(() => (this.event()?.ammunition ? RECORDED : ''));
  readonly note = linkedSignal<string>(() => this.event()?.note ?? '');
  /** Where a new event starts instead of the user's current location */
  readonly initialLocation = input<GeoPoint | null>(null);

  /** Where the event happened; moved with the location picker */
  readonly location = linkedSignal<GeoPoint | null>(() => this.event()?.location ?? this.initialLocation() ?? null);
  /** A new event placed away from the user's position can be moved back to it */
  protected readonly canReturnToPosition = computed(() => {
    const position = this.position();
    const location = this.location();
    if (this.event() || !position || !location) {
      return false;
    }
    return (
      Math.abs(position.latitude - location.latitude) > POSITION_TOLERANCE ||
      Math.abs(position.longitude - location.longitude) > POSITION_TOLERANCE
    );
  });
  /** Local "YYYY-MM-DDTHH:mm" value of the date input; now for a new event */
  readonly occurredAt = linkedSignal<string>(() => {
    const event = this.event();
    return toDateTimeLocal(event ? new Date(event.occurredAt) : new Date());
  });

  /** The compressed photo shown in the form; for an edited event its stored photo, once loaded */
  protected readonly photo = signal<Blob | null>(null);
  /** The user took, replaced or removed the photo, so it is stored anew on saving */
  private readonly photoChanged = signal(false);
  protected readonly photoUrl = signal<string | null>(null);
  /** Compressing a new photo or storing it on saving */
  protected readonly photoBusy = signal(false);
  protected readonly photoError = signal(false);

  protected readonly saving = this.store.selectSignal(selectSaving);
  protected readonly error = this.store.selectSignal(selectSaveError);
  private readonly position = this.store.selectSignal(selectPosition);
  protected readonly locationStatus = this.store.selectSignal(selectStatus);

  /** Latest selectable date and time; events can't be recorded in the future */
  protected readonly maxOccurredAt = toDateTimeLocal(new Date());
  protected readonly isFuture = computed(() => {
    const occurredAt = fromDateTimeLocal(this.occurredAt());
    return occurredAt !== null && new Date(occurredAt).getTime() > Date.now();
  });

  protected readonly canSubmit = computed(
    () =>
      !!this.type() &&
      fromDateTimeLocal(this.occurredAt()) !== null &&
      !this.isFuture() &&
      !this.herdSizeInvalid() &&
      !this.tagNumberInvalid() &&
      !this.saving() &&
      !this.photoBusy(),
  );

  /** Emits the stored event once it has been persisted */
  readonly saved = output<HuntingEvent>();

  constructor() {
    // A new event starts at the user's current location, once it is known;
    // later location updates don't move a position the user may already have adjusted
    effect(() => {
      const position = this.position();
      if (!this.event() && !this.location() && position) {
        this.location.set({ latitude: position.latitude, longitude: position.longitude });
      }
    });

    // An object url lets the preview show the photo without reading it into memory as text
    effect((onCleanup) => {
      const photo = this.photo();
      if (!photo) {
        this.photoUrl.set(null);
        return;
      }
      const url = URL.createObjectURL(photo);
      this.photoUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });

    inject(Actions)
      .pipe(ofType(EventsActions.addEventSuccess, EventsActions.updateEventSuccess), takeUntilDestroyed())
      .subscribe(({ event }) => this.saved.emit(event));
  }

  ngOnInit(): void {
    // Refresh the location so a new event is recorded where the user is now;
    // an edited event keeps the location it was recorded at
    if (!this.event()) {
      this.store.dispatch(LocationActions.locate());
    }
    // The saved firearms and ammunition to choose from for a harvest
    this.store.dispatch(FirearmsActions.load());
    this.store.dispatch(AmmunitionActions.load());

    const photoId = this.event()?.photoId;
    if (photoId) {
      void this.storage.getPhoto(photoId).then((photo) => {
        // A photo taken meanwhile wins over the stored one
        if (photo && !this.photoChanged()) {
          this.photo.set(photo);
        }
      });
    }
  }

  /** Moves the location back to where the user's device is now */
  protected returnToPosition(): void {
    const position = this.position();
    if (position) {
      this.location.set({ latitude: position.latitude, longitude: position.longitude });
    }
  }

  protected async selectPhoto(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    // Lets the same photo be chosen again after removing it
    input.value = '';
    if (!file) {
      return;
    }
    this.photoBusy.set(true);
    this.photoError.set(false);
    try {
      this.photo.set(await compressImage(file));
      this.photoChanged.set(true);
    } catch {
      this.photoError.set(true);
    } finally {
      this.photoBusy.set(false);
    }
  }

  protected removePhoto(): void {
    this.photo.set(null);
    this.photoChanged.set(true);
    this.photoError.set(false);
  }

  protected selectType(value: string): void {
    this.type.set(value as Item);
  }

  protected firearmLabel(firearm: FirearmSnapshot): string {
    return firearmLabel(firearm);
  }

  protected ammunitionLabel(ammunition: AmmunitionSnapshot): string {
    return ammunitionLabel(ammunition, this.numberFormat());
  }

  /** A copy of the chosen firearm, so the event keeps it as it was even when the firearm is changed later */
  private chosenFirearm(): FirearmSnapshot | null {
    const choice = this.firearmChoice();
    if (choice === RECORDED) {
      return this.event()?.firearm ?? null;
    }
    const firearm = this.firearms().find(({ id }) => id === choice);
    return firearm ? snapshot(firearm) : null;
  }

  private chosenAmmunition(): AmmunitionSnapshot | null {
    const choice = this.ammunitionChoice();
    if (choice === RECORDED) {
      return this.event()?.ammunition ?? null;
    }
    const ammunition = this.ammunitionOptions().find(({ id }) => id === choice);
    return ammunition ? snapshot(ammunition) : null;
  }

  protected selectAnimal(value: string): void {
    this.animal.set(value as Animal);
  }

  protected selectSex(value: string): void {
    this.sex.set(value ? (value as Sex) : null);
  }

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    const type = this.type();
    const occurredAt = fromDateTimeLocal(this.occurredAt());
    if (!type || !occurredAt || this.isFuture() || this.herdSizeInvalid() || this.tagNumberInvalid() || this.saving()) {
      return;
    }

    // Hidden fields filled in before switching to a type without them are dropped
    const fields = {
      type,
      animal: this.hasAnimal() ? this.animal() : null,
      herd: this.isHerd(),
      herdSize: this.isHerd() && this.herdSize().trim() ? Number(this.herdSize()) : null,
      sex: this.hasAnimal() && (this.isHerd() || this.sex() !== 'mixed') ? this.sex() : null,
      tagNumber: this.hasTagNumber() && this.tagNumber() ? this.tagNumber() : null,
      firearm: this.hasWeapon() ? this.chosenFirearm() : null,
      ammunition: this.hasWeapon() ? this.chosenAmmunition() : null,
      location: this.location(),
      note: this.note().trim(),
      occurredAt,
    };
    const photo = this.photo();
    if (!this.photoChanged()) {
      this.save(fields, this.event()?.photoId);
    } else if (!photo) {
      this.save(fields, null);
    } else {
      // The photo is stored first, so the event never points to a missing photo
      this.photoBusy.set(true);
      this.storage
        .addPhoto(photo)
        .then(
          (photoId) => this.save(fields, photoId),
          () => this.photoError.set(true),
        )
        .finally(() => this.photoBusy.set(false));
    }
  }

  private save(fields: Omit<NewHuntingEvent, 'photoId'>, photoId: string | null | undefined): void {
    const editing = this.event();
    if (editing) {
      this.store.dispatch(EventsActions.updateEvent({ event: { ...editing, ...fields, photoId } }));
    } else {
      this.store.dispatch(EventsActions.addEvent({ event: { ...fields, photoId } }));
    }
  }
}
