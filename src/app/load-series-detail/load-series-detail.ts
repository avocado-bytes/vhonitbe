import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DOCUMENT, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { HandloadingDialog } from '../handloading-dialog/handloading-dialog';
import { firearmLabel } from '../model/firearm';
import { LoadSeries, promotionBlocker, TestLoad, velocityStats, VelocityStats } from '../model/load-series';
import { FocusTrap } from '../shared/focus-trap';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import {
  selectForm,
  selectLoading,
  selectPromoteError,
  selectPromoting,
  selectSaveError,
  selectSaving,
  selectSeries,
} from '../state/handloading/handloading.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';

/** A detail of a series: its translation key and its value */
interface Detail {
  label: string;
  value: string;
}

/** Test loads without a charge or length come last */
function compareLoads(a: TestLoad, b: TestLoad): number {
  const byNumber = (x: number | null, y: number | null) => (x ?? Infinity) - (y ?? Infinity) || 0;
  return byNumber(a.powderCharge, b.powderCharge) || byNumber(a.overallLength, b.overallLength);
}

/**
 * A load development series: its details and components, and its test loads, each added with the floating
 * add button, edited, deleted or – once it proves itself – added to the ammunition list
 */
@Component({
  imports: [TranslatePipe, NgTemplateOutlet, RouterLink, FocusTrap, HandloadingDialog],
  selector: 'app-load-series-detail',
  styleUrl: './load-series-detail.scss',
  templateUrl: './load-series-detail.html',
  host: {
    '(document:keydown.escape)': 'closeActions()',
  },
})
export class LoadSeriesDetail {
  private readonly store = inject(Store);
  private readonly translate = inject(TranslateService);
  private readonly window = inject(DOCUMENT).defaultView;

  private readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? '')), {
    initialValue: '',
  });
  private readonly allSeries = this.store.selectSignal(selectSeries);
  protected readonly series = computed(() => this.allSeries().find(({ id }) => id === this.id()) ?? null);
  protected readonly loading = this.store.selectSignal(selectLoading);
  protected readonly loads = computed(() => [...(this.series()?.loads ?? [])].sort(compareLoads));
  protected readonly form = this.store.selectSignal(selectForm);
  private readonly saving = this.store.selectSignal(selectSaving);
  private readonly saveError = this.store.selectSignal(selectSaveError);
  /** A test load deleted from its actions failed to save; errors of the forms show in the forms */
  protected readonly actionError = computed(() => !this.form() && !this.saving() && !!this.saveError());
  private readonly promoting = this.store.selectSignal(selectPromoting);
  protected readonly promoteError = this.store.selectSignal(selectPromoteError);
  private readonly language = this.store.selectSignal(selectLanguage);
  private readonly numberFormat = computed(() => new Intl.NumberFormat(this.language(), { maximumFractionDigits: 3 }));
  private readonly statsFormat = computed(() => new Intl.NumberFormat(this.language(), { maximumFractionDigits: 1 }));
  private readonly dateFormat = computed(() => new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium' }));
  /** Id of the test load whose action menu is open on phones, if any */
  protected readonly actionsFor = signal<string | null>(null);

  /** The details of the series that were given */
  protected readonly details = computed<Detail[]>(() => {
    const series = this.series();
    if (!series) {
      return [];
    }
    const bullet = [series.bulletType, series.bulletWeight ? `${this.formatNumber(series.bulletWeight)} gr` : ''].filter(Boolean).join(' ');
    const details: [string, string | null | undefined][] = [
      ['FIREARMS.FORM.CALIBER', series.caliber],
      ['HANDLOADING.FORM.STARTED_AT', series.startedAt ? this.formatDay(series.startedAt) : null],
      ['HANDLOADING.BULLET', bullet],
      ['AMMUNITION.FORM.POWDER', series.powder],
      ['AMMUNITION.FORM.PRIMER', series.primer],
      ['AMMUNITION.FORM.BRASS', series.brass],
      ['HANDLOADING.FORM.CASE_LENGTH', series.caseLength ? `${this.formatNumber(series.caseLength)} mm` : null],
      ['HANDLOADING.FORM.FIREARM', series.firearm ? firearmLabel(series.firearm) : null],
    ];
    return details.flatMap(([label, value]) => (value ? [{ label, value }] : []));
  });

  constructor() {
    // The series may be opened directly, e.g. after a reload
    this.store.dispatch(HandloadingActions.load());
  }

  protected formatNumber(value: number): string {
    return this.numberFormat().format(value);
  }

  protected formatStat(value: number): string {
    return this.statsFormat().format(value);
  }

  /** A "YYYY-MM-DD" day in the local time zone */
  private formatDay(day: string): string {
    const [year, month, date] = day.split('-').map(Number);
    return this.dateFormat().format(new Date(year, month - 1, date));
  }

  protected formatDate(iso: string): string {
    return this.dateFormat().format(new Date(iso));
  }

  protected stats(load: TestLoad): VelocityStats | null {
    return velocityStats(load.velocities);
  }

  /** Why the load cannot be added to the ammunition list yet, as a translation key; null when it can */
  protected promotionBlocker(series: LoadSeries, load: TestLoad): string | null {
    const blocker = promotionBlocker(series, load);
    return blocker && `HANDLOADING.PROMOTE_NEEDS.${blocker}`;
  }

  protected isPromoting(id: string): boolean {
    return this.promoting().includes(id);
  }

  protected toggleActions(id: string): void {
    this.actionsFor.update((open) => (open === id ? null : id));
  }

  protected closeActions(): void {
    this.actionsFor.set(null);
  }

  protected editSeries(series: LoadSeries): void {
    this.store.dispatch(HandloadingActions.startEdit({ series }));
  }

  protected addLoad(): void {
    const series = this.series();
    if (series) {
      this.store.dispatch(HandloadingActions.startAddLoad({ seriesId: series.id }));
    }
  }

  protected editLoad(series: LoadSeries, load: TestLoad): void {
    this.store.dispatch(HandloadingActions.startEditLoad({ seriesId: series.id, load }));
  }

  protected deleteLoad(series: LoadSeries, load: TestLoad): void {
    if (this.window?.confirm(this.translate.instant('HANDLOADING.DELETE_LOAD_CONFIRM'))) {
      this.store.dispatch(
        HandloadingActions.updateSeries({ series: { ...series, loads: (series.loads ?? []).filter(({ id }) => id !== load.id) } }),
      );
    }
  }

  protected promote(series: LoadSeries, load: TestLoad): void {
    if (this.window?.confirm(this.translate.instant('HANDLOADING.PROMOTE_CONFIRM'))) {
      this.store.dispatch(HandloadingActions.promoteLoad({ series, loadId: load.id }));
    }
  }
}
