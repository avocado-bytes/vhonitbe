import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { MpbrCalculator, MpbrInput } from '../ballistics/mpbr';
import { ammunitionLabel, inRange, parseDecimal } from '../model/ammunition';
import { firearmLabel } from '../model/firearm';
import { AmmunitionActions } from '../state/ammunition/ammunition.actions';
import { selectSorted as selectSortedAmmunition } from '../state/ammunition/ammunition.reducer';
import { FirearmsActions } from '../state/firearms/firearms.actions';
import { selectSorted as selectSortedFirearms } from '../state/firearms/firearms.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';

/** The vital zone the shooter aims to stay within, in cm; 8 cm by default, as the user's Czech practice */
export const DEFAULT_VITAL_ZONE = 8;
export const VITAL_ZONE_RANGE = { min: 2, max: 50 } as const;
/** Shooting ranges are often only 35 m long, so rifles are commonly zeroed there */
export const DEFAULT_ZEROING_DISTANCE = 35;
export const ZEROING_DISTANCE_RANGE = { min: 10, max: 300 } as const;

/** Why the MPBR cannot be calculated for the chosen firearm and ammunition */
type MissingData = 'sight-height' | 'ballistic-coefficient';

/**
 * Zeroing: the maximum point blank range of the chosen ammunition from the chosen firearm, for a vital zone,
 * and where the bullet hits at the distance the shooter zeroes at
 */
@Component({
  imports: [TranslatePipe, RouterLink],
  selector: 'app-zeroing',
  styleUrl: './zeroing.scss',
  templateUrl: './zeroing.html',
})
export class Zeroing {
  private readonly store = inject(Store);
  private readonly calculator = inject(MpbrCalculator);

  protected readonly firearms = this.store.selectSignal(selectSortedFirearms);
  protected readonly ammunition = this.store.selectSignal(selectSortedAmmunition);
  private readonly language = this.store.selectSignal(selectLanguage);

  protected readonly vitalZoneRange = VITAL_ZONE_RANGE;
  protected readonly zeroingDistanceRange = ZEROING_DISTANCE_RANGE;

  readonly firearmId = signal('');
  readonly ammunitionId = signal('');
  /** The raw values of the inputs, which accept a decimal comma */
  readonly vitalZone = signal(String(DEFAULT_VITAL_ZONE));
  readonly zeroingDistance = signal(String(DEFAULT_ZEROING_DISTANCE));

  protected readonly firearm = computed(() => this.firearms().find(({ id }) => id === this.firearmId()) ?? null);
  protected readonly chosenAmmunition = computed(() => this.ammunition().find(({ id }) => id === this.ammunitionId()) ?? null);
  private readonly vitalZoneValue = computed(() => parseDecimal(this.vitalZone()));
  private readonly zeroingDistanceValue = computed(() => parseDecimal(this.zeroingDistance()));
  protected readonly vitalZoneInvalid = computed(() => !inRange(this.vitalZoneValue(), VITAL_ZONE_RANGE));
  protected readonly zeroingDistanceInvalid = computed(() => !inRange(this.zeroingDistanceValue(), ZEROING_DISTANCE_RANGE));

  /** Calibers are typed in by the user, so they are compared without case and spaces */
  protected readonly caliberMismatch = computed(() => {
    const firearm = this.firearm();
    const ammunition = this.chosenAmmunition();
    const normalize = (caliber: string) => caliber.toLowerCase().replace(/\s+/g, '');
    return !!firearm && !!ammunition && normalize(firearm.caliber) !== normalize(ammunition.caliber);
  });

  protected readonly missing = computed((): MissingData[] => {
    const firearm = this.firearm();
    const ammunition = this.chosenAmmunition();
    return [
      ...(firearm && !firearm.sightHeight ? (['sight-height'] as const) : []),
      ...(ammunition && !ammunition.ballisticCoefficient ? (['ballistic-coefficient'] as const) : []),
    ];
  });

  /** Everything the calculation needs, once it is all given and valid */
  private readonly input = computed((): MpbrInput | undefined => {
    const sightHeight = this.firearm()?.sightHeight;
    const ammunition = this.chosenAmmunition();
    const vitalZone = this.vitalZoneValue();
    const zeroingDistance = this.zeroingDistanceValue();
    if (!sightHeight || !ammunition?.ballisticCoefficient || this.vitalZoneInvalid() || this.zeroingDistanceInvalid()) {
      return undefined;
    }
    return {
      muzzleVelocity: ammunition.muzzleVelocity,
      ballisticCoefficient: ammunition.ballisticCoefficient,
      sightHeight,
      vitalZone: vitalZone!,
      zeroingDistance: zeroingDistance!,
    };
  });

  protected readonly result = resource({
    params: () => this.input(),
    loader: ({ params }) => this.calculator.calculate(params),
  });

  private readonly numberFormat = computed(() => new Intl.NumberFormat(this.language(), { maximumFractionDigits: 1 }));
  /** Heights with their sign and one decimal, e.g. "+0,3" */
  private readonly heightFormat = computed(
    () => new Intl.NumberFormat(this.language(), { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' }),
  );

  constructor() {
    this.store.dispatch(FirearmsActions.load());
    this.store.dispatch(AmmunitionActions.load());
  }

  protected firearmLabel = firearmLabel;

  protected ammunitionLabel(ammunition: Parameters<typeof ammunitionLabel>[0]): string {
    return ammunitionLabel(ammunition, this.numberFormat());
  }

  protected formatNumber(value: number): string {
    return this.numberFormat().format(value);
  }

  protected formatHeight(value: number): string {
    // Rounding first, so a tiny negative height is not shown as "-0,0"
    return this.heightFormat().format(Math.round(value * 10) / 10 || 0);
  }

  /** Whether the bullet hits above, below or at the point of aim, once rounded to the shown millimetre */
  protected direction(value: number): 'ABOVE' | 'BELOW' | 'AT' {
    const rounded = Math.round(value * 10) / 10;
    return rounded > 0 ? 'ABOVE' : rounded < 0 ? 'BELOW' : 'AT';
  }
}
