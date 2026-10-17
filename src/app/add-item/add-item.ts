import { Component, computed, effect, inject, input, linkedSignal, OnInit, output, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { GeoPoint, HuntingEvent, NewHuntingEvent } from '../model/event';
import { Animal, ANIMAL_GROUPS, Item, ITEMS } from '../model/item';
import { LocationPicker } from '../location-picker/location-picker';
import { compressImage } from '../shared/compress-image';
import { fromDateTimeLocal, toDateTimeLocal } from '../shared/datetime-local';
import { EventStorage } from '../storage/event-storage';
import { EventsActions } from '../state/events/events.actions';
import { selectSaveError, selectSaving } from '../state/events/events.reducer';
import { LocationActions } from '../state/location/location.actions';
import { selectPosition, selectStatus } from '../state/location/location.reducer';

@Component({
  imports: [TranslatePipe, KeyValuePipe, LocationPicker],
  selector: 'app-add-item',
  styleUrl: './add-item.scss',
  templateUrl: './add-item.html',
})
export class AddItem implements OnInit {
  private readonly store = inject(Store);
  private readonly storage = inject(EventStorage);

  protected readonly items = ITEMS;
  protected readonly animalGroups = ANIMAL_GROUPS;
  /** Keeps the groups in their declared order instead of KeyValuePipe's alphabetical order */
  protected readonly keepOrder = () => 0;

  /** The event to edit; without it a new event is added */
  readonly event = input<HuntingEvent | null>(null);

  readonly type = linkedSignal<Item | null>(() => this.event()?.type ?? null);
  readonly animal = linkedSignal<Animal | null>(() => this.event()?.animal ?? null);
  readonly note = linkedSignal<string>(() => this.event()?.note ?? '');
  /** Where a new event starts instead of the user's current location */
  readonly initialLocation = input<GeoPoint | null>(null);

  /** Where the event happened; moved with the location picker */
  readonly location = linkedSignal<GeoPoint | null>(() => this.event()?.location ?? this.initialLocation() ?? null);
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
      !!this.type() && fromDateTimeLocal(this.occurredAt()) !== null && !this.isFuture() && !this.saving() && !this.photoBusy(),
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

  protected selectAnimal(value: string): void {
    this.animal.set(value as Animal);
  }

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    const type = this.type();
    const occurredAt = fromDateTimeLocal(this.occurredAt());
    if (!type || !occurredAt || this.isFuture() || this.saving()) {
      return;
    }

    const fields = { type, animal: this.animal(), location: this.location(), note: this.note().trim(), occurredAt };
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
