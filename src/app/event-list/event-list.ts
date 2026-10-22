import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { afterNextRender, Component, computed, DOCUMENT, ElementRef, inject, Injector, input, signal, viewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { EventMap } from '../event-map/event-map';
import { EventPhoto } from '../event-photo/event-photo';
import { EventView } from '../event-view/event-view';
import { HuntingEvent } from '../model/event';
import { FocusTrap } from '../shared/focus-trap';
import { formatTagNumber } from '../shared/tag-number';
import { EventsActions } from '../state/events/events.actions';
import { selectDeleting } from '../state/events/events.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';

/**
 * A list of events with their details and actions: show the photo or the location in a dialog, share, edit and delete.
 * A tap on an event shows it in full, read only.
 * On phones the actions are collected in a menu behind a single button.
 */
@Component({
  imports: [TranslatePipe, DecimalPipe, NgTemplateOutlet, EventMap, EventPhoto, EventView, FocusTrap],
  selector: 'app-event-list',
  styleUrl: './event-list.scss',
  templateUrl: './event-list.html',
  host: {
    '(document:keydown.escape)': 'closeActions()',
  },
})
export class EventList {
  private readonly store = inject(Store);
  private readonly translate = inject(TranslateService);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly injector = inject(Injector);

  readonly events = input.required<readonly HuntingEvent[]>();
  /** Marks the list as busy while it is being (re)loaded */
  readonly busy = input(false);

  private readonly deleting = this.store.selectSignal(selectDeleting);
  private readonly language = this.store.selectSignal(selectLanguage);
  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium', timeStyle: 'short' }),
  );
  protected readonly formatTagNumber = formatTagNumber;

  /** Id of the event whose action menu is open on phones, if any */
  protected readonly actionsFor = signal<string | null>(null);

  /** The event shown in full in the view dialog, if any */
  protected readonly viewEvent = signal<HuntingEvent | null>(null);
  private readonly viewDialog = viewChild.required<ElementRef<HTMLDialogElement>>('viewDialog');
  /** The event shown in the map dialog, if any */
  protected readonly mapEvent = signal<HuntingEvent | null>(null);
  private readonly mapDialog = viewChild.required<ElementRef<HTMLDialogElement>>('mapDialog');
  /** The event shown in the photo dialog, if any */
  protected readonly photoEvent = signal<HuntingEvent | null>(null);
  private readonly photoDialog = viewChild.required<ElementRef<HTMLDialogElement>>('photoDialog');

  protected formatDate(iso: string): string {
    return this.dateFormat().format(new Date(iso));
  }

  protected toggleActions(id: string): void {
    this.actionsFor.update((open) => (open === id ? null : id));
  }

  protected closeActions(): void {
    this.actionsFor.set(null);
  }

  protected share(event: HuntingEvent): void {
    this.store.dispatch(EventsActions.shareEvent({ event }));
  }

  protected edit(event: HuntingEvent): void {
    this.store.dispatch(EventsActions.startEdit({ event }));
  }

  /** Shows the event in full, unless the tap was on one of its actions or in its action menu */
  protected openView(event: HuntingEvent, domEvent: MouseEvent): void {
    const target = domEvent.target as HTMLElement;
    if (target.closest('button:not(.item-open), a, [role="menu"]')) {
      return;
    }
    this.viewEvent.set(event);
    // Open once the content is rendered, so focus moves to its close button
    afterNextRender(() => this.viewDialog().nativeElement.showModal(), { injector: this.injector });
  }

  protected closeView(): void {
    this.viewDialog().nativeElement.close();
  }

  protected showOnMap(event: HuntingEvent): void {
    this.mapEvent.set(event);
    // Open once the content is rendered, so focus moves to its close button
    afterNextRender(() => this.mapDialog().nativeElement.showModal(), { injector: this.injector });
  }

  protected closeMap(): void {
    this.mapDialog().nativeElement.close();
  }

  protected showPhoto(event: HuntingEvent): void {
    this.photoEvent.set(event);
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
    if (this.window?.confirm(this.translate.instant('OVERVIEW.DELETE_CONFIRM'))) {
      this.store.dispatch(EventsActions.deleteEvent({ id }));
    }
  }
}
