import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DOCUMENT, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HandloadingDialog } from '../handloading-dialog/handloading-dialog';
import { LoadSeries } from '../model/load-series';
import { FocusTrap } from '../shared/focus-trap';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import {
  selectDeleteError,
  selectDeleting,
  selectLoadError,
  selectLoading,
  selectSorted,
} from '../state/handloading/handloading.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';

/**
 * Handloading: the user's load development series, each started with the floating add button and opened
 * on its own page to work through its test loads. As in the other lists, phones collect the actions
 * of a series in a menu behind a single button.
 */
@Component({
  imports: [TranslatePipe, NgTemplateOutlet, RouterLink, FocusTrap, HandloadingDialog],
  selector: 'app-handloading',
  styleUrl: './handloading.scss',
  templateUrl: './handloading.html',
  host: {
    '(document:keydown.escape)': 'closeActions()',
  },
})
export class Handloading {
  private readonly store = inject(Store);
  private readonly translate = inject(TranslateService);
  private readonly window = inject(DOCUMENT).defaultView;

  protected readonly series = this.store.selectSignal(selectSorted);
  protected readonly loading = this.store.selectSignal(selectLoading);
  protected readonly loadError = this.store.selectSignal(selectLoadError);
  protected readonly deleteError = this.store.selectSignal(selectDeleteError);
  private readonly deleting = this.store.selectSignal(selectDeleting);
  private readonly language = this.store.selectSignal(selectLanguage);
  private readonly numberFormat = computed(() => new Intl.NumberFormat(this.language(), { maximumFractionDigits: 3 }));
  private readonly dateFormat = computed(() => new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium' }));
  /** Id of the series whose action menu is open on phones, if any */
  protected readonly actionsFor = signal<string | null>(null);

  constructor() {
    this.store.dispatch(HandloadingActions.load());
  }

  /** The components and start of a series on one line, each only when given */
  protected summary(series: LoadSeries): string[] {
    const bullet = [series.bulletType, series.bulletWeight ? `${this.numberFormat().format(series.bulletWeight)} gr` : '']
      .filter(Boolean)
      .join(' ');
    return [series.name ? series.caliber : '', bullet, series.powder ?? '', series.startedAt ? this.formatDate(series.startedAt) : ''].filter(
      Boolean,
    );
  }

  /** A "YYYY-MM-DD" day in the local time zone */
  protected formatDate(day: string): string {
    const [year, month, date] = day.split('-').map(Number);
    return this.dateFormat().format(new Date(year, month - 1, date));
  }

  protected toggleActions(id: string): void {
    this.actionsFor.update((open) => (open === id ? null : id));
  }

  protected closeActions(): void {
    this.actionsFor.set(null);
  }

  protected isDeleting(id: string): boolean {
    return this.deleting().includes(id);
  }

  protected add(): void {
    this.store.dispatch(HandloadingActions.startAdd());
  }

  protected edit(series: LoadSeries): void {
    this.store.dispatch(HandloadingActions.startEdit({ series }));
  }

  protected delete(id: string): void {
    if (this.window?.confirm(this.translate.instant('HANDLOADING.DELETE_CONFIRM'))) {
      this.store.dispatch(HandloadingActions.deleteSeries({ id }));
    }
  }
}
