import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { inRange, parseDecimal } from '../model/ammunition';
import {
  barrelLengthRange,
  BARREL_LENGTH_RANGE_MM,
  COMMON_CALIBERS,
  Firearm,
  LENGTH_UNITS,
  LengthUnit,
  Optics,
  OPTICS,
  ThreadPitch,
  THREAD_PITCH_RANGE,
  toMillimetres,
} from '../model/firearm';
import { FirearmsActions } from '../state/firearms/firearms.actions';
import { selectSaveError, selectSaving } from '../state/firearms/firearms.reducer';

/**
 * Adds or edits a firearm: its name, its caliber picked from the common ones or typed in,
 * its barrel length in mm or inches, its thread pitch as a ratio, its optics, which default to none, with their make and model,
 * and whether it is suppressed
 */
@Component({
  imports: [TranslatePipe],
  selector: 'app-firearm-form',
  styleUrl: './firearm-form.scss',
  templateUrl: './firearm-form.html',
})
export class FirearmForm {
  private readonly store = inject(Store);

  protected readonly opticsOptions = OPTICS;
  protected readonly calibers = COMMON_CALIBERS;
  protected readonly lengthUnits = LENGTH_UNITS;
  protected readonly threadPitchRange = THREAD_PITCH_RANGE;

  /** The firearm to edit; without it a new firearm is added */
  readonly firearm = input<Firearm | null>(null);

  readonly name = linkedSignal(() => this.firearm()?.name ?? '');
  readonly caliber = linkedSignal(() => this.firearm()?.caliber ?? '');
  readonly optics = linkedSignal<Optics>(() => this.firearm()?.optics ?? 'none');
  readonly opticsModel = linkedSignal(() => this.firearm()?.opticsModel ?? '');
  readonly suppressed = linkedSignal(() => this.firearm()?.suppressed ?? false);
  /** The raw value of the barrel length input, in the chosen unit; a stored length is shown in mm */
  readonly barrelLength = linkedSignal(() => {
    const length = this.firearm()?.barrelLength;
    return length === null || length === undefined ? '' : String(length);
  });
  readonly lengthUnit = linkedSignal<LengthUnit>(() => {
    this.firearm();
    return 'mm';
  });
  protected readonly lengthRange = computed(() => barrelLengthRange(this.lengthUnit()));
  /** The barrel length in mm, or null when not given or not a number */
  private readonly barrelLengthMm = computed(() => {
    const length = parseDecimal(this.barrelLength());
    return length === null ? null : toMillimetres(length, this.lengthUnit());
  });
  /** The raw values of the two numbers of the thread pitch, which accept a decimal comma */
  readonly threadNumerator = linkedSignal(() => this.numberText(this.firearm()?.threadPitch?.numerator));
  readonly threadDenominator = linkedSignal(() => this.numberText(this.firearm()?.threadPitch?.denominator));
  /** Both numbers are needed once either is given */
  protected readonly threadPitchInvalid = computed(() => {
    const numerator = this.threadNumerator().trim();
    const denominator = this.threadDenominator().trim();
    if (!numerator && !denominator) {
      return false;
    }
    return !inRange(parseDecimal(numerator), THREAD_PITCH_RANGE) || !inRange(parseDecimal(denominator), THREAD_PITCH_RANGE);
  });
  protected readonly barrelLengthInvalid = computed(
    () => this.barrelLength().trim() !== '' && !inRange(this.barrelLengthMm(), BARREL_LENGTH_RANGE_MM),
  );
  /** The make and model are only asked for once a sight is chosen */
  protected readonly hasOptics = computed(() => this.optics() !== 'none');

  protected readonly saving = this.store.selectSignal(selectSaving);
  protected readonly error = this.store.selectSignal(selectSaveError);
  protected readonly canSubmit = computed(
    () =>
      !!this.name().trim() && !!this.caliber().trim() && !this.barrelLengthInvalid() && !this.threadPitchInvalid() && !this.saving(),
  );

  private numberText(value: number | null | undefined): string {
    return value === null || value === undefined ? '' : String(value);
  }

  /** The thread pitch to store; null when not given */
  private threadPitch(): ThreadPitch | null {
    const numerator = parseDecimal(this.threadNumerator());
    const denominator = parseDecimal(this.threadDenominator());
    return numerator === null || denominator === null ? null : { numerator, denominator };
  }

  protected selectLengthUnit(value: string): void {
    this.lengthUnit.set(value as LengthUnit);
  }

  protected selectOptics(value: string): void {
    this.optics.set(value as Optics);
  }

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    // A make and model typed before switching back to no optics is dropped
    const opticsModel = this.hasOptics() ? this.opticsModel().trim() || null : null;
    const fields = {
      name: this.name().trim(),
      caliber: this.caliber().trim(),
      optics: this.optics(),
      opticsModel,
      suppressed: this.suppressed(),
      barrelLength: this.barrelLengthMm(),
      threadPitch: this.threadPitch(),
    };
    const editing = this.firearm();
    if (editing) {
      this.store.dispatch(FirearmsActions.updateFirearm({ firearm: { ...editing, ...fields } }));
    } else {
      this.store.dispatch(FirearmsActions.addFirearm({ firearm: fields }));
    }
  }
}
