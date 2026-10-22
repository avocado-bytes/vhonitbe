import { Component, computed, inject, input } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { EventMap } from '../event-map/event-map';
import { EventPhoto } from '../event-photo/event-photo';
import { FeedingPlace, needsReplenishing } from '../model/feeding-place';
import { selectSettings } from '../state/feeding/feeding.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';

/**
 * A feeding place in a read-only, formatted form: when it was last replenished and whether it needs it now,
 * where it is, the note and the photo. Only what was given is shown.
 */
@Component({
  imports: [TranslatePipe, EventMap, EventPhoto],
  selector: 'app-feeding-place-view',
  styleUrl: '../event-view/event-view.scss',
  templateUrl: './feeding-place-view.html',
})
export class FeedingPlaceView {
  private readonly store = inject(Store);
  private readonly language = this.store.selectSignal(selectLanguage);
  private readonly settings = this.store.selectSignal(selectSettings);
  private readonly dateFormat = computed(() => new Intl.DateTimeFormat(this.language(), { dateStyle: 'full', timeStyle: 'short' }));

  readonly place = input.required<FeedingPlace>();

  protected readonly lastReplenished = computed(() => {
    const replenishedAt = this.place().lastReplenishedAt;
    return replenishedAt ? this.dateFormat().format(new Date(replenishedAt)) : null;
  });
  /** During the feeding season, as in the list */
  protected readonly needsReplenishing = computed(() => needsReplenishing(this.place(), this.settings(), new Date()));

  protected formatCoordinate(value: number): string {
    return value.toFixed(5);
  }
}
