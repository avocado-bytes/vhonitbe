import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, DOCUMENT, ElementRef, inject, Injector, input, signal, viewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { EventMap } from '../event-map/event-map';
import { EventPhoto } from '../event-photo/event-photo';
import { FeedingPlace, needsReplenishing } from '../model/feeding-place';
import { FocusTrap } from '../shared/focus-trap';
import { FeedingActions } from '../state/feeding/feeding.actions';
import { selectDeleting, selectReplenishing, selectSettings } from '../state/feeding/feeding.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';

/** How often the list checks whether places have become due for replenishing */
const NOW_REFRESH_MS = 60_000;

/**
 * A list of feeding places with their details and actions: mark as replenished, show the photo or the location
 * in a dialog, share, edit and delete. During the feeding season places due for replenishing are marked with a red band.
 * On phones the actions are collected in a menu behind a single button.
 */
@Component({
  imports: [TranslatePipe, DecimalPipe, NgTemplateOutlet, EventMap, EventPhoto, FocusTrap],
  selector: 'app-feeding-place-list',
  styleUrl: './feeding-place-list.scss',
  templateUrl: './feeding-place-list.html',
  host: {
    '(document:keydown.escape)': 'closeActions()',
  },
})
export class FeedingPlaceList {
  private readonly store = inject(Store);
  private readonly translate = inject(TranslateService);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly injector = inject(Injector);

  readonly places = input.required<readonly FeedingPlace[]>();
  /** Marks the list as busy while it is being (re)loaded */
  readonly busy = input(false);

  private readonly deleting = this.store.selectSignal(selectDeleting);
  private readonly replenishing = this.store.selectSignal(selectReplenishing);
  private readonly settings = this.store.selectSignal(selectSettings);
  private readonly language = this.store.selectSignal(selectLanguage);
  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium', timeStyle: 'short' }),
  );
  /** The current time, updated every minute so places become due on their own */
  private readonly now = signal(Date.now());

  /** Id of the place whose action menu is open on phones, if any */
  protected readonly actionsFor = signal<string | null>(null);

  /** The place shown in the map dialog, if any */
  protected readonly mapPlace = signal<FeedingPlace | null>(null);
  private readonly mapDialog = viewChild.required<ElementRef<HTMLDialogElement>>('mapDialog');
  /** The place shown in the photo dialog, if any */
  protected readonly photoPlace = signal<FeedingPlace | null>(null);
  private readonly photoDialog = viewChild.required<ElementRef<HTMLDialogElement>>('photoDialog');

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), NOW_REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected formatDate(iso: string): string {
    return this.dateFormat().format(new Date(iso));
  }

  protected needsReplenishing(place: FeedingPlace): boolean {
    return needsReplenishing(place, this.settings(), new Date(this.now()));
  }

  protected isReplenishing(id: string): boolean {
    return this.replenishing().includes(id);
  }

  protected replenish(place: FeedingPlace): void {
    this.store.dispatch(FeedingActions.replenishPlace({ place }));
  }

  protected toggleActions(id: string): void {
    this.actionsFor.update((open) => (open === id ? null : id));
  }

  protected closeActions(): void {
    this.actionsFor.set(null);
  }

  protected share(place: FeedingPlace): void {
    this.store.dispatch(FeedingActions.sharePlace({ place }));
  }

  protected edit(place: FeedingPlace): void {
    this.store.dispatch(FeedingActions.startEdit({ place }));
  }

  protected showOnMap(place: FeedingPlace): void {
    this.mapPlace.set(place);
    // Open once the content is rendered, so focus moves to its close button
    afterNextRender(() => this.mapDialog().nativeElement.showModal(), { injector: this.injector });
  }

  protected closeMap(): void {
    this.mapDialog().nativeElement.close();
  }

  protected showPhoto(place: FeedingPlace): void {
    this.photoPlace.set(place);
    // Open once the content is rendered, so focus moves to its close button
    afterNextRender(() => this.photoDialog().nativeElement.showModal(), { injector: this.injector });
  }

  protected closePhoto(): void {
    this.photoDialog().nativeElement.close();
  }

  protected isDeleting(id: string): boolean {
    return this.deleting().includes(id);
  }

  protected delete(id: string): void {
    if (this.window?.confirm(this.translate.instant('FEEDING.DELETE_CONFIRM'))) {
      this.store.dispatch(FeedingActions.deletePlace({ id }));
    }
  }
}
