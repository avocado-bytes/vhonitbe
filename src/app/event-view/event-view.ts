import { Component, computed, inject, input } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { EventMap } from '../event-map/event-map';
import { EventPhoto } from '../event-photo/event-photo';
import { AmmunitionSnapshot, FirearmSnapshot, HuntingEvent } from '../model/event';
import { formatThreadPitch } from '../model/firearm';
import { formatTagNumber } from '../shared/tag-number';
import { selectLanguage } from '../state/settings/settings.reducer';

/** A labelled value; the label is a translation key */
export interface ViewDetail {
  label: string;
  value: string;
}

/**
 * An event in a read-only, formatted form: what happened and when, the animal, the firearm and ammunition
 * of a harvest as they were recorded, where it happened, the note and the photo. Only what was given is shown.
 */
@Component({
  imports: [TranslatePipe, EventMap, EventPhoto],
  selector: 'app-event-view',
  styleUrl: './event-view.scss',
  templateUrl: './event-view.html',
})
export class EventView {
  private readonly translate = inject(TranslateService);
  private readonly language = inject(Store).selectSignal(selectLanguage);
  private readonly numberFormat = computed(() => new Intl.NumberFormat(this.language(), { maximumFractionDigits: 3 }));
  private readonly dateFormat = computed(() => new Intl.DateTimeFormat(this.language(), { dateStyle: 'full', timeStyle: 'short' }));

  readonly event = input.required<HuntingEvent>();

  protected readonly occurredAt = computed(() => this.dateFormat().format(new Date(this.event().occurredAt)));

  protected readonly animal = computed<ViewDetail[]>(() => {
    const event = this.event();
    return this.given([
      ['ADD_ITEM.ANIMAL', event.animal && this.translate.instant(`ANIMALS.${event.animal}`)],
      ['ADD_ITEM.SEX', event.sex && this.translate.instant(`SEXES.${event.sex}`)],
      ['EVENT_VIEW.HERD', event.herd ? this.translate.instant(event.herdSize ? 'OVERVIEW.HERD_OF' : 'OVERVIEW.HERD', { count: event.herdSize }) : null],
      ['ADD_ITEM.TAG_NUMBER', event.tagNumber && formatTagNumber(event.tagNumber)],
    ]);
  });

  protected readonly firearm = computed(() => {
    const firearm = this.event().firearm;
    return firearm ? { title: firearm.name, details: this.firearmDetails(firearm) } : null;
  });

  protected readonly ammunition = computed(() => {
    const ammunition = this.event().ammunition;
    return ammunition ? { title: ammunition.caliber, details: this.ammunitionDetails(ammunition) } : null;
  });

  /** Where the shooter stood and how far the shot was, for a harvest */
  protected readonly shot = computed<ViewDetail[]>(() => {
    const { shooterLocation, shotDistance } = this.event();
    return this.given([
      [
        'ADD_ITEM.SHOOTER_POSITION',
        shooterLocation && `${this.formatCoordinate(shooterLocation.latitude)}, ${this.formatCoordinate(shooterLocation.longitude)}`,
      ],
      ['ADD_ITEM.SHOT_DISTANCE', shotDistance !== null && shotDistance !== undefined && `${this.format(shotDistance)} m`],
    ]);
  });

  private format(value: number): string {
    return this.numberFormat().format(value);
  }

  /** The details that were given, in their order */
  private given(details: [string, string | null | undefined | false][]): ViewDetail[] {
    return details.flatMap(([label, value]) => (value ? [{ label, value }] : []));
  }

  private firearmDetails(firearm: FirearmSnapshot): ViewDetail[] {
    const optics =
      firearm.optics === 'none'
        ? this.translate.instant('FIREARMS.OPTICS.none')
        : [this.translate.instant(`FIREARMS.OPTICS.${firearm.optics}`), firearm.opticsModel].filter(Boolean).join(' ');
    return this.given([
      ['FIREARMS.FORM.CALIBER', firearm.caliber],
      ['FIREARMS.FORM.OPTICS', optics],
      ['FIREARMS.FORM.BARREL_LENGTH', firearm.barrelLength ? `${this.format(firearm.barrelLength)} mm` : null],
      ['FIREARMS.FORM.THREAD_PITCH', firearm.threadPitch && formatThreadPitch(firearm.threadPitch, this.numberFormat())],
      ['EVENT_VIEW.SUPPRESSOR', this.translate.instant(firearm.suppressed ? 'EVENT_VIEW.YES' : 'EVENT_VIEW.NO')],
    ]);
  }

  private ammunitionDetails(ammunition: AmmunitionSnapshot): ViewDetail[] {
    const handload = ammunition.source === 'handload';
    return this.given([
      ['EVENT_VIEW.SOURCE', this.translate.instant(`AMMUNITION.SOURCES.${ammunition.source}`)],
      ['AMMUNITION.FORM.PRODUCT', ammunition.product],
      ['AMMUNITION.FORM.BULLET_TYPE', ammunition.bulletType],
      ['AMMUNITION.FORM.BULLET_WEIGHT', `${this.format(ammunition.bulletWeight)} gr`],
      ['AMMUNITION.FORM.MUZZLE_VELOCITY', `${this.format(ammunition.muzzleVelocity)} m/s`],
      ['AMMUNITION.FORM.BALLISTIC_COEFFICIENT', ammunition.ballisticCoefficient !== null && this.format(ammunition.ballisticCoefficient)],
      ['AMMUNITION.FORM.PRIMER', handload && ammunition.primer],
      ['AMMUNITION.FORM.POWDER', handload && ammunition.powder],
      ['AMMUNITION.FORM.POWDER_CHARGE', handload && ammunition.powderCharge && `${this.format(ammunition.powderCharge)} gr`],
      ['AMMUNITION.FORM.BRASS', handload && ammunition.brass],
      [
        'AMMUNITION.FORM.BRASS_FIRINGS',
        handload && ammunition.brassFirings !== null && ammunition.brassFirings !== undefined && `${ammunition.brassFirings}×`,
      ],
      ['AMMUNITION.FORM.OVERALL_LENGTH', handload && ammunition.overallLength && `${this.format(ammunition.overallLength)} mm`],
    ]);
  }

  protected formatCoordinate(value: number): string {
    return value.toFixed(5);
  }
}
