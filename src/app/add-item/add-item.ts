import { Component, computed, effect, inject, input, linkedSignal, OnInit, output } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { GeoPoint, HuntingEvent } from '../model/event';
import { Animal, ANIMAL_GROUPS, Item, ITEMS } from '../model/item';
import { LocationPicker } from '../location-picker/location-picker';
import { fromDateTimeLocal, toDateTimeLocal } from '../shared/datetime-local';
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

  protected readonly items = ITEMS;
  protected readonly animalGroups = ANIMAL_GROUPS;
  /** Keeps the groups in their declared order instead of KeyValuePipe's alphabetical order */
  protected readonly keepOrder = () => 0;

  /** The event to edit; without it a new event is added */
  readonly event = input<HuntingEvent | null>(null);

  readonly type = linkedSignal<Item | null>(() => this.event()?.type ?? null);
  readonly animal = linkedSignal<Animal | null>(() => this.event()?.animal ?? null);
  readonly note = linkedSignal<string>(() => this.event()?.note ?? '');
  /** Where the event happened; moved with the location picker */
  readonly location = linkedSignal<GeoPoint | null>(() => this.event()?.location ?? null);
  /** Local "YYYY-MM-DDTHH:mm" value of the date input; now for a new event */
  readonly occurredAt = linkedSignal<string>(() => {
    const event = this.event();
    return toDateTimeLocal(event ? new Date(event.occurredAt) : new Date());
  });

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
    () => !!this.type() && fromDateTimeLocal(this.occurredAt()) !== null && !this.isFuture() && !this.saving(),
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

    const editing = this.event();
    if (editing) {
      this.store.dispatch(
        EventsActions.updateEvent({
          event: { ...editing, type, animal: this.animal(), occurredAt, location: this.location(), note: this.note().trim() },
        }),
      );
      return;
    }

    this.store.dispatch(
      EventsActions.addEvent({
        event: { type, animal: this.animal(), location: this.location(), note: this.note().trim(), occurredAt },
      }),
    );
  }
}
