import { Component, computed, inject, input, linkedSignal, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { BULLET_WEIGHT_RANGE, inRange, parseDecimal } from '../model/ammunition';
import { FirearmSnapshot, snapshot } from '../model/event';
import { COMMON_CALIBERS, firearmLabel } from '../model/firearm';
import { CASE_LENGTH_RANGE, LoadSeries } from '../model/load-series';
import { toDateTimeLocal } from '../shared/datetime-local';
import { FirearmsActions } from '../state/firearms/firearms.actions';
import { selectSorted as selectSortedFirearms } from '../state/firearms/firearms.reducer';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import { selectSaveError, selectSaving } from '../state/handloading/handloading.reducer';

/** The dropdown value of the firearm copied into an edited series, as opposed to the id of a saved one */
const RECORDED = 'recorded';

function numberText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Starts or edits a load development series: its caliber, name and start date, the components kept the same
 * throughout it – bullet, powder, primer, brass and case length – and the firearm the loads are tested in
 */
@Component({
  imports: [TranslatePipe],
  selector: 'app-load-series-form',
  templateUrl: './load-series-form.html',
})
export class LoadSeriesForm implements OnInit {
  private readonly store = inject(Store);

  protected readonly calibers = COMMON_CALIBERS;
  protected readonly weightRange = BULLET_WEIGHT_RANGE;
  protected readonly caseLengthRange = CASE_LENGTH_RANGE;
  protected readonly recorded = RECORDED;
  protected readonly firearms = this.store.selectSignal(selectSortedFirearms);

  /** The series to edit; without it a new series is started */
  readonly series = input<LoadSeries | null>(null);

  readonly caliber = linkedSignal(() => this.series()?.caliber ?? '');
  readonly name = linkedSignal(() => this.series()?.name ?? '');
  /** "YYYY-MM-DD"; today for a new series */
  readonly startedAt = linkedSignal(() => {
    const series = this.series();
    return series ? (series.startedAt ?? '') : toDateTimeLocal(new Date()).slice(0, 10);
  });
  readonly bulletType = linkedSignal(() => this.series()?.bulletType ?? '');
  /** The raw values of the number inputs, which accept a decimal comma */
  readonly bulletWeight = linkedSignal(() => numberText(this.series()?.bulletWeight));
  readonly powder = linkedSignal(() => this.series()?.powder ?? '');
  readonly primer = linkedSignal(() => this.series()?.primer ?? '');
  readonly brass = linkedSignal(() => this.series()?.brass ?? '');
  readonly caseLength = linkedSignal(() => numberText(this.series()?.caseLength));
  /** Empty for none, RECORDED for the copy in an edited series, or the id of a saved firearm */
  readonly firearmChoice = linkedSignal<string>(() => (this.series()?.firearm ? RECORDED : ''));

  protected readonly weightInvalid = computed(() => this.invalid(this.bulletWeight(), BULLET_WEIGHT_RANGE));
  protected readonly caseLengthInvalid = computed(() => this.invalid(this.caseLength(), CASE_LENGTH_RANGE));

  protected readonly saving = this.store.selectSignal(selectSaving);
  protected readonly error = this.store.selectSignal(selectSaveError);
  protected readonly canSubmit = computed(
    () => !!this.caliber().trim() && !this.weightInvalid() && !this.caseLengthInvalid() && !this.saving(),
  );

  ngOnInit(): void {
    // The saved firearms to choose from
    this.store.dispatch(FirearmsActions.load());
  }

  protected firearmLabel(firearm: FirearmSnapshot): string {
    return firearmLabel(firearm);
  }

  private invalid(value: string, range: { min: number; max: number }): boolean {
    return value.trim() !== '' && !inRange(parseDecimal(value), range);
  }

  /** A copy of the chosen firearm, so the series keeps it as it was even when the firearm is changed later */
  private chosenFirearm(): FirearmSnapshot | null {
    const choice = this.firearmChoice();
    if (choice === RECORDED) {
      return this.series()?.firearm ?? null;
    }
    const firearm = this.firearms().find(({ id }) => id === choice);
    return firearm ? snapshot(firearm) : null;
  }

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    const fields = {
      caliber: this.caliber().trim(),
      name: this.name().trim(),
      startedAt: this.startedAt() || null,
      bulletType: this.bulletType().trim(),
      bulletWeight: parseDecimal(this.bulletWeight()),
      powder: this.powder().trim(),
      primer: this.primer().trim(),
      brass: this.brass().trim(),
      caseLength: parseDecimal(this.caseLength()),
      firearm: this.chosenFirearm(),
    };
    const editing = this.series();
    if (editing) {
      // The test loads are kept as they are
      this.store.dispatch(HandloadingActions.updateSeries({ series: { ...editing, ...fields } }));
    } else {
      this.store.dispatch(HandloadingActions.addSeries({ series: { ...fields, loads: [] } }));
    }
  }
}
