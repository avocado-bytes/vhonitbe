import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { inRange, MUZZLE_VELOCITY_RANGE, OVERALL_LENGTH_RANGE, parseDecimal, POWDER_CHARGE_RANGE } from '../model/ammunition';
import { GROUP_SIZE_RANGE, LoadSeries, parseVelocities, SHOTS_RANGE, TestLoad, velocityStats } from '../model/load-series';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import { selectSaveError, selectSaving } from '../state/handloading/handloading.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';

function numberText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Adds or edits a test load of a series: its powder charge and overall length, and how it shot –
 * shots fired, group size, the velocity of each shot and notes such as pressure signs
 */
@Component({
  imports: [TranslatePipe],
  selector: 'app-test-load-form',
  templateUrl: './test-load-form.html',
})
export class TestLoadForm {
  private readonly store = inject(Store);

  protected readonly chargeRange = POWDER_CHARGE_RANGE;
  protected readonly lengthRange = OVERALL_LENGTH_RANGE;
  protected readonly shotsRange = SHOTS_RANGE;
  protected readonly groupRange = GROUP_SIZE_RANGE;
  protected readonly velocityRange = MUZZLE_VELOCITY_RANGE;

  /** The series the load belongs to */
  readonly series = input.required<LoadSeries>();
  /** The test load to edit; without it a new one is added */
  readonly load = input<TestLoad | null>(null);

  /** The raw values of the inputs; the numbers accept a decimal comma */
  readonly powderCharge = linkedSignal(() => numberText(this.load()?.powderCharge));
  readonly overallLength = linkedSignal(() => numberText(this.load()?.overallLength));
  readonly shots = linkedSignal(() => numberText(this.load()?.shots));
  readonly groupSize = linkedSignal(() => numberText(this.load()?.groupSize));
  readonly velocities = linkedSignal(() => this.load()?.velocities.join(', ') ?? '');
  readonly notes = linkedSignal(() => this.load()?.notes ?? '');

  protected readonly chargeInvalid = computed(() => this.invalid(this.powderCharge(), POWDER_CHARGE_RANGE));
  protected readonly lengthInvalid = computed(() => this.invalid(this.overallLength(), OVERALL_LENGTH_RANGE));
  protected readonly groupInvalid = computed(() => this.invalid(this.groupSize(), GROUP_SIZE_RANGE));
  protected readonly shotsInvalid = computed(() => {
    const value = this.shots().trim();
    return value !== '' && !(/^\d+$/.test(value) && inRange(Number(value), SHOTS_RANGE));
  });
  private readonly parsedVelocities = computed(() => parseVelocities(this.velocities()));
  protected readonly velocitiesInvalid = computed(() => this.parsedVelocities() === null);
  /** Shown as the velocities are typed */
  protected readonly stats = computed(() => velocityStats(this.parsedVelocities() ?? []));
  private readonly language = this.store.selectSignal(selectLanguage);
  private readonly numberFormat = computed(() => new Intl.NumberFormat(this.language(), { maximumFractionDigits: 1 }));

  protected readonly saving = this.store.selectSignal(selectSaving);
  protected readonly error = this.store.selectSignal(selectSaveError);
  protected readonly canSubmit = computed(
    () =>
      !this.chargeInvalid() &&
      !this.lengthInvalid() &&
      !this.groupInvalid() &&
      !this.shotsInvalid() &&
      !this.velocitiesInvalid() &&
      !this.saving(),
  );

  protected format(value: number): string {
    return this.numberFormat().format(value);
  }

  private invalid(value: string, range: { min: number; max: number }): boolean {
    return value.trim() !== '' && !inRange(parseDecimal(value), range);
  }

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    const fields = {
      powderCharge: parseDecimal(this.powderCharge()),
      overallLength: parseDecimal(this.overallLength()),
      shots: this.shots().trim() ? Number(this.shots()) : null,
      groupSize: parseDecimal(this.groupSize()),
      velocities: this.parsedVelocities() ?? [],
      notes: this.notes().trim(),
    };
    const series = this.series();
    const editing = this.load();
    const loads = series.loads ?? [];
    this.store.dispatch(
      HandloadingActions.updateSeries({
        series: {
          ...series,
          loads: editing
            ? loads.map((load) => (load.id === editing.id ? { ...editing, ...fields } : load))
            : [...loads, { id: crypto.randomUUID(), ...fields, promotedAt: null }],
        },
      }),
    );
  }
}
