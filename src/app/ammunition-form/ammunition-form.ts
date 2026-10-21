import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import {
  Ammunition,
  AMMUNITION_SOURCES,
  AmmunitionSource,
  BALLISTIC_COEFFICIENT_RANGE,
  BRASS_FIRINGS_RANGE,
  BULLET_WEIGHT_RANGE,
  inRange,
  MUZZLE_VELOCITY_RANGE,
  OVERALL_LENGTH_RANGE,
  parseDecimal,
  POWDER_CHARGE_RANGE,
} from '../model/ammunition';
import { COMMON_CALIBERS } from '../model/firearm';
import { AmmunitionActions } from '../state/ammunition/ammunition.actions';
import { selectSaveError, selectSaving } from '../state/ammunition/ammunition.reducer';

/**
 * Adds or edits ammunition: its caliber, factory or handload, bullet weight, muzzle velocity,
 * bullet type and G1 ballistic coefficient; for factory ammunition also its make and product name,
 * for a handload its primer, powder and charge, brass, how many times the brass has been fired
 * and the overall cartridge length
 */
@Component({
  imports: [TranslatePipe],
  selector: 'app-ammunition-form',
  templateUrl: './ammunition-form.html',
})
export class AmmunitionForm {
  private readonly store = inject(Store);

  protected readonly calibers = COMMON_CALIBERS;
  protected readonly sources = AMMUNITION_SOURCES;
  protected readonly weightRange = BULLET_WEIGHT_RANGE;
  protected readonly velocityRange = MUZZLE_VELOCITY_RANGE;
  protected readonly coefficientRange = BALLISTIC_COEFFICIENT_RANGE;
  protected readonly firingsRange = BRASS_FIRINGS_RANGE;
  protected readonly chargeRange = POWDER_CHARGE_RANGE;
  protected readonly lengthRange = OVERALL_LENGTH_RANGE;

  /** The ammunition to edit; without it new ammunition is added */
  readonly ammunition = input<Ammunition | null>(null);

  readonly caliber = linkedSignal(() => this.ammunition()?.caliber ?? '');
  readonly source = linkedSignal<AmmunitionSource>(() => this.ammunition()?.source ?? 'factory');
  /** The raw values of the number inputs, which accept a decimal comma */
  readonly bulletWeight = linkedSignal(() => this.numberText(this.ammunition()?.bulletWeight));
  readonly muzzleVelocity = linkedSignal(() => this.numberText(this.ammunition()?.muzzleVelocity));
  readonly bulletType = linkedSignal(() => this.ammunition()?.bulletType ?? '');
  readonly ballisticCoefficient = linkedSignal(() => this.numberText(this.ammunition()?.ballisticCoefficient));
  readonly primer = linkedSignal(() => this.ammunition()?.primer ?? '');
  readonly powder = linkedSignal(() => this.ammunition()?.powder ?? '');
  readonly brass = linkedSignal(() => this.ammunition()?.brass ?? '');
  readonly brassFirings = linkedSignal(() => this.numberText(this.ammunition()?.brassFirings));
  readonly product = linkedSignal(() => this.ammunition()?.product ?? '');
  readonly powderCharge = linkedSignal(() => this.numberText(this.ammunition()?.powderCharge));
  readonly overallLength = linkedSignal(() => this.numberText(this.ammunition()?.overallLength));
  /** The components are only asked for a handload */
  protected readonly isHandload = computed(() => this.source() === 'handload');
  protected readonly isFactory = computed(() => this.source() === 'factory');

  /** An entered number out of its range is pointed out; an empty required one only keeps the form from saving */
  protected readonly weightInvalid = computed(() => this.invalid(this.bulletWeight(), BULLET_WEIGHT_RANGE));
  protected readonly velocityInvalid = computed(() => this.invalid(this.muzzleVelocity(), MUZZLE_VELOCITY_RANGE));
  protected readonly coefficientInvalid = computed(() => this.invalid(this.ballisticCoefficient(), BALLISTIC_COEFFICIENT_RANGE));
  protected readonly chargeInvalid = computed(() => this.isHandload() && this.invalid(this.powderCharge(), POWDER_CHARGE_RANGE));
  protected readonly lengthInvalid = computed(() => this.isHandload() && this.invalid(this.overallLength(), OVERALL_LENGTH_RANGE));
  /** The number of firings is a whole number */
  protected readonly firingsInvalid = computed(() => {
    const value = this.brassFirings().trim();
    return this.isHandload() && value !== '' && !(/^\d+$/.test(value) && inRange(Number(value), BRASS_FIRINGS_RANGE));
  });

  protected readonly saving = this.store.selectSignal(selectSaving);
  protected readonly error = this.store.selectSignal(selectSaveError);
  protected readonly canSubmit = computed(
    () =>
      !!this.caliber().trim() &&
      inRange(parseDecimal(this.bulletWeight()), BULLET_WEIGHT_RANGE) &&
      inRange(parseDecimal(this.muzzleVelocity()), MUZZLE_VELOCITY_RANGE) &&
      !this.coefficientInvalid() &&
      !this.firingsInvalid() &&
      !this.chargeInvalid() &&
      !this.lengthInvalid() &&
      !this.saving(),
  );

  private numberText(value: number | null | undefined): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private invalid(value: string, range: { min: number; max: number }): boolean {
    return value.trim() !== '' && !inRange(parseDecimal(value), range);
  }

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    // Details typed before switching between factory and handload are dropped
    const handload = this.isHandload();
    const fields = {
      caliber: this.caliber().trim(),
      source: this.source(),
      bulletWeight: parseDecimal(this.bulletWeight())!,
      muzzleVelocity: parseDecimal(this.muzzleVelocity())!,
      bulletType: this.bulletType().trim(),
      ballisticCoefficient: parseDecimal(this.ballisticCoefficient()),
      primer: handload ? this.primer().trim() : '',
      powder: handload ? this.powder().trim() : '',
      brass: handload ? this.brass().trim() : '',
      brassFirings: handload && this.brassFirings().trim() ? Number(this.brassFirings()) : null,
      product: handload ? '' : this.product().trim(),
      powderCharge: handload ? parseDecimal(this.powderCharge()) : null,
      overallLength: handload ? parseDecimal(this.overallLength()) : null,
    };
    const editing = this.ammunition();
    if (editing) {
      this.store.dispatch(AmmunitionActions.updateAmmunition({ ammunition: { ...editing, ...fields } }));
    } else {
      this.store.dispatch(AmmunitionActions.addAmmunition({ ammunition: fields }));
    }
  }
}
