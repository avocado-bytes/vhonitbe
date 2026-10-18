import { Component, computed, effect, inject, input, linkedSignal, OnInit, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { GeoPoint } from '../model/event';
import { FEEDING_PLACE_TYPES, FeedingPlace, FeedingPlaceType, NewFeedingPlace } from '../model/feeding-place';
import { LocationPicker } from '../location-picker/location-picker';
import { compressImage } from '../shared/compress-image';
import { EventStorage } from '../storage/event-storage';
import { FeedingActions } from '../state/feeding/feeding.actions';
import { selectSaveError, selectSaving } from '../state/feeding/feeding.reducer';
import { LocationActions } from '../state/location/location.actions';
import { selectPosition, selectStatus } from '../state/location/location.reducer';

/** Adds or edits a feeder or a salt lick: its type, location, note and photo */
@Component({
  imports: [TranslatePipe, LocationPicker],
  selector: 'app-feeding-place-form',
  styleUrl: './feeding-place-form.scss',
  templateUrl: './feeding-place-form.html',
})
export class FeedingPlaceForm implements OnInit {
  private readonly store = inject(Store);
  private readonly storage = inject(EventStorage);

  protected readonly types = FEEDING_PLACE_TYPES;

  /** The place to edit; without it a new place is added */
  readonly place = input<FeedingPlace | null>(null);

  readonly type = linkedSignal<FeedingPlaceType | null>(() => this.place()?.type ?? null);
  readonly note = linkedSignal<string>(() => this.place()?.note ?? '');
  /** Where the place is; moved with the location picker */
  readonly location = linkedSignal<GeoPoint | null>(() => this.place()?.location ?? null);

  /** The compressed photo shown in the form; for an edited place its stored photo, once loaded */
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

  protected readonly canSubmit = computed(() => !!this.type() && !this.saving() && !this.photoBusy());

  constructor() {
    // A new place starts at the user's current location, once it is known;
    // later location updates don't move a position the user may already have adjusted
    effect(() => {
      const position = this.position();
      if (!this.place() && !this.location() && position) {
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
  }

  ngOnInit(): void {
    // Refresh the location so a new place is recorded where the user is now;
    // an edited place keeps its location
    if (!this.place()) {
      this.store.dispatch(LocationActions.locate());
    }

    const photoId = this.place()?.photoId;
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
    this.type.set(value as FeedingPlaceType);
  }

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    const type = this.type();
    if (!type || this.saving()) {
      return;
    }

    const fields = { type, location: this.location(), note: this.note().trim() };
    const photo = this.photo();
    if (!this.photoChanged()) {
      this.save(fields, this.place()?.photoId ?? null);
    } else if (!photo) {
      this.save(fields, null);
    } else {
      // The photo is stored first, so the place never points to a missing photo
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

  private save(fields: Omit<NewFeedingPlace, 'photoId'>, photoId: string | null): void {
    const editing = this.place();
    if (editing) {
      this.store.dispatch(FeedingActions.updatePlace({ place: { ...editing, ...fields, photoId } }));
    } else {
      this.store.dispatch(FeedingActions.addPlace({ place: { ...fields, photoId } }));
    }
  }
}
