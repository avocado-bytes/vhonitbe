import { afterNextRender, Component, computed, effect, ElementRef, inject, Injector, linkedSignal, untracked, viewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { FeedingMap } from '../feeding-map/feeding-map';
import { FeedingPlaceForm } from '../feeding-place-form/feeding-place-form';
import { FeedingPlaceList } from '../feeding-place-list/feeding-place-list';
import { FEEDING_PLACE_TYPES, FeedingPlaceType } from '../model/feeding-place';
import { isInSeason, isValidReplenishDays, MAX_REPLENISH_DAYS, MIN_REPLENISH_DAYS } from '../model/feeding-settings';
import { FeedingActions } from '../state/feeding/feeding.actions';
import {
  selectCurrentPage,
  selectDeleteError,
  selectEditing,
  selectFormOpen,
  selectLoadError,
  selectLoading,
  selectLocated,
  selectPage,
  selectPageCount,
  selectPlaceType,
  selectReplenishError,
  selectSettings,
  selectTotal,
} from '../state/feeding/feeding.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';

/**
 * A dashboard of the places where game is fed: tiles setting the feeding season and how often feeders are
 * replenished, a map of all feeding places and a list of them
 */
@Component({
  imports: [TranslatePipe, FeedingMap, FeedingPlaceForm, FeedingPlaceList],
  selector: 'app-feeding',
  styleUrl: './feeding.scss',
  templateUrl: './feeding.html',
})
export class Feeding {
  private readonly store = inject(Store);
  private readonly injector = inject(Injector);

  protected readonly types = FEEDING_PLACE_TYPES;
  protected readonly located = this.store.selectSignal(selectLocated);
  protected readonly places = this.store.selectSignal(selectPage);
  protected readonly total = this.store.selectSignal(selectTotal);
  protected readonly pageIndex = this.store.selectSignal(selectCurrentPage);
  protected readonly pageCount = this.store.selectSignal(selectPageCount);
  protected readonly placeType = this.store.selectSignal(selectPlaceType);
  protected readonly loading = this.store.selectSignal(selectLoading);
  protected readonly loadError = this.store.selectSignal(selectLoadError);
  protected readonly deleteError = this.store.selectSignal(selectDeleteError);
  protected readonly replenishError = this.store.selectSignal(selectReplenishError);

  /** The add/edit form is open, from the add button or a place's edit action */
  protected readonly formOpen = this.store.selectSignal(selectFormOpen);
  /** The place being edited; null while adding a new one */
  protected readonly editing = this.store.selectSignal(selectEditing);
  private readonly formDialog = viewChild.required<ElementRef<HTMLDialogElement>>('formDialog');

  protected readonly settings = this.store.selectSignal(selectSettings);
  protected readonly inSeason = computed(() => isInSeason(this.settings(), new Date()));
  private readonly language = this.store.selectSignal(selectLanguage);
  /** Months 1–12 with their names in the selected language */
  protected readonly months = computed(() => {
    const format = new Intl.DateTimeFormat(this.language(), { month: 'long' });
    return Array.from({ length: 12 }, (_, index) => ({ value: index + 1, name: format.format(new Date(2000, index, 1)) }));
  });
  protected readonly minReplenishDays = MIN_REPLENISH_DAYS;
  protected readonly maxReplenishDays = MAX_REPLENISH_DAYS;
  /** The raw value of the replenishment input; only a valid number of days is stored */
  protected readonly replenishDays = linkedSignal(() => String(this.settings().replenishDays));
  protected readonly replenishDaysInvalid = computed(() => !isValidReplenishDays(Number(this.replenishDays())));

  constructor() {
    this.store.dispatch(FeedingActions.load());

    // The dialog follows the state, so it also closes once a place has been saved
    effect(() => {
      const open = this.formOpen();
      const dialog = untracked(this.formDialog).nativeElement;
      if (open && !dialog.open) {
        // Open once the form is rendered, so focus moves to its first field
        afterNextRender(() => dialog.showModal(), { injector: this.injector });
      } else if (!open && dialog.open) {
        dialog.close();
      }
    });
  }

  protected setSeasonStart(value: string): void {
    this.store.dispatch(FeedingActions.setSeason({ seasonStart: Number(value), seasonEnd: this.settings().seasonEnd }));
  }

  protected setSeasonEnd(value: string): void {
    this.store.dispatch(FeedingActions.setSeason({ seasonStart: this.settings().seasonStart, seasonEnd: Number(value) }));
  }

  protected setReplenishDays(value: string): void {
    this.replenishDays.set(value);
    const days = Number(value);
    if (value.trim() !== '' && isValidReplenishDays(days)) {
      this.store.dispatch(FeedingActions.setReplenishDays({ replenishDays: days }));
    }
  }

  protected setType(value: string): void {
    this.store.dispatch(FeedingActions.setType({ placeType: value ? (value as FeedingPlaceType) : null }));
  }

  protected goToPage(pageIndex: number): void {
    this.store.dispatch(FeedingActions.goToPage({ pageIndex }));
  }

  protected add(): void {
    this.store.dispatch(FeedingActions.startAdd());
  }

  protected closeForm(): void {
    this.formDialog().nativeElement.close();
  }

  /** Closing with the close button or Escape cancels the form */
  protected onFormClosed(): void {
    if (this.formOpen()) {
      this.store.dispatch(FeedingActions.closeForm());
    }
  }
}
