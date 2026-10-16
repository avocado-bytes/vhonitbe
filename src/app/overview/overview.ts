import { Component, computed, DOCUMENT, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { HuntingEvent } from '../model/event';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { EventsActions } from '../state/events/events.actions';
import {
  selectDeleteError,
  selectDeleting,
  selectEvents,
  selectLoadError,
  selectLoading,
  selectPageCount,
  selectPageIndex,
  selectTotal,
} from '../state/events/events.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';

@Component({
  imports: [TranslatePipe, DecimalPipe],
  selector: 'app-overview',
  styleUrl: './overview.scss',
  templateUrl: './overview.html',
})
export class Overview {
  private readonly store = inject(Store);
  private readonly translate = inject(TranslateService);
  private readonly window = inject(DOCUMENT).defaultView;

  protected readonly events = this.store.selectSignal(selectEvents);
  protected readonly total = this.store.selectSignal(selectTotal);
  protected readonly pageIndex = this.store.selectSignal(selectPageIndex);
  protected readonly pageCount = this.store.selectSignal(selectPageCount);
  protected readonly loading = this.store.selectSignal(selectLoading);
  protected readonly loadError = this.store.selectSignal(selectLoadError);
  protected readonly deleteError = this.store.selectSignal(selectDeleteError);
  private readonly deleting = this.store.selectSignal(selectDeleting);

  private readonly language = this.store.selectSignal(selectLanguage);
  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium', timeStyle: 'short' }),
  );

  protected formatDate(iso: string): string {
    return this.dateFormat().format(new Date(iso));
  }

  protected goToPage(pageIndex: number): void {
    this.store.dispatch(EventsActions.loadPage({ pageIndex }));
  }

  protected edit(event: HuntingEvent): void {
    this.store.dispatch(EventsActions.startEdit({ event }));
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
