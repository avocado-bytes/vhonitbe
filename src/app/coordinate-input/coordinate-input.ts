import { Component, computed, effect, input, linkedSignal, model, output, signal } from '@angular/core';
import { GeoPoint } from '../model/event';
import { parseCoordinatePair } from '../shared/coordinate-pair';

/** Decimal places of a coordinate; about 10 cm, as in the location picker */
export const COORDINATE_DECIMALS = 6;
/** Integer digits the faint mask shows before the decimal point */
const MASK_INTEGER_DIGITS = 2;

export type CoordinateAxis = 'latitude' | 'longitude';

/** The largest value of each axis in degrees, either way from zero */
const LIMITS: Record<CoordinateAxis, number> = { latitude: 90, longitude: 180 };

/**
 * Keeps only what a coordinate in decimal degrees is made of: an optional leading minus, the integer digits,
 * one decimal point (a comma is taken as one) and at most {@link COORDINATE_DECIMALS} decimals. A digit that would
 * make the integer part too large for the axis starts the decimals instead, so "49123456" becomes "49.123456".
 */
export function formatCoordinateText(raw: string, limit: number): string {
  let result = '';
  let integer = '';
  let decimals = -1;
  for (const char of raw) {
    if (char === '-' && result === '') {
      result = '-';
    } else if ((char === '.' || char === ',') && decimals < 0) {
      if (integer === '') {
        integer = '0';
        result += '0';
      }
      result += '.';
      decimals = 0;
    } else if (/\d/.test(char)) {
      if (decimals < 0 && integer !== '' && Number(integer + char) > limit) {
        result += '.';
        decimals = 0;
      }
      if (decimals < 0) {
        integer += char;
        result += char;
      } else if (decimals < COORDINATE_DECIMALS) {
        result += char;
        decimals++;
      }
    }
  }
  return result;
}

/** The value of the text, or null when it isn't a coordinate of the axis */
export function parseCoordinate(text: string, limit: number): number | null {
  if (!/^-?\d+(\.\d*)?$/.test(text)) {
    return null;
  }
  const value = Number(text);
  return Math.abs(value) <= limit ? value : null;
}

const PRECISION = 10 ** COORDINATE_DECIMALS;

function sameCoordinate(a: number | null, b: number | null): boolean {
  return a === b || (a !== null && b !== null && Math.abs(a - b) < 1 / PRECISION / 2);
}

/**
 * A text field for a latitude or longitude in decimal degrees, styled like the tag number input: monospace digits
 * with the decimals still missing shown as a faint mask. It opens the decimal keyboard, accepts a comma as the
 * decimal point and adds the point on its own once the integer part is complete.
 *
 * Pasting a whole position, both latitude and longitude, passes it on as a pair.
 * The message for an invalid value is given as content, and shown once the user has left the field.
 *
 * A value set from outside, e.g. by panning a map, replaces the text; a typed value is passed on once all its
 * decimals are given or when the user leaves the field, so the map doesn't jump around while typing.
 */
@Component({
  selector: 'app-coordinate-input',
  styleUrl: './coordinate-input.scss',
  templateUrl: './coordinate-input.html',
})
export class CoordinateInput {
  readonly value = model<number | null>(null);
  readonly axis = input.required<CoordinateAxis>();
  readonly inputId = input.required<string>();
  readonly describedBy = input<string | null>(null);
  /** Whether the text isn't a valid coordinate, so the parent can point it out and refuse to save */
  readonly invalid = model(false);
  /** Emits a whole position pasted into the field, e.g. "49.7215, 13.9512" copied from a map app, instead of pasting it */
  readonly pairPasted = output<GeoPoint>();

  private readonly limit = computed(() => LIMITS[this.axis()]);
  /** The text in the field; kept while it still means the current value, e.g. "49.1" for 49.1 */
  protected readonly text = linkedSignal<number | null, string>({
    source: this.value,
    computation: (value, previous) =>
      previous && sameCoordinate(parseCoordinate(previous.value, this.limit()), value)
        ? previous.value
        : value === null
          ? ''
          : value.toFixed(COORDINATE_DECIMALS),
  });
  /** The user left the field, so an invalid value is pointed out */
  protected readonly touched = signal(false);
  protected readonly showInvalid = computed(() => this.invalid() && this.touched());
  protected readonly errorId = computed(() => `${this.inputId()}-error`);
  protected readonly ariaDescribedBy = computed(
    () => [this.describedBy(), this.showInvalid() ? this.errorId() : null].filter(Boolean).join(' ') || null,
  );
  protected readonly ghost = computed(() => {
    const text = this.text();
    const point = text.indexOf('.');
    if (point >= 0) {
      return '0'.repeat(COORDINATE_DECIMALS - (text.length - point - 1));
    }
    const digits = text.replace('-', '').length;
    return '0'.repeat(Math.max(0, MASK_INTEGER_DIGITS - digits)) + '.' + '0'.repeat(COORDINATE_DECIMALS);
  });

  constructor() {
    effect(() => this.invalid.set(parseCoordinate(this.text(), this.limit()) === null));
  }

  protected onInput(input: HTMLInputElement, event: Event): void {
    let raw = input.value;
    let caret = input.selectionStart ?? raw.length;
    let text = formatCoordinateText(raw, this.limit());
    // Backspace right after the point that was added on its own only removed the point; remove the digit before it instead
    if ((event as InputEvent).inputType === 'deleteContentBackward' && text === this.text() && caret > 0) {
      raw = raw.slice(0, caret - 1) + raw.slice(caret);
      caret--;
      text = formatCoordinateText(raw, this.limit());
    }

    // Set right away, so the caret can be placed in the reformatted text
    input.value = text;
    const caretAt = Math.min(formatCoordinateText(raw.slice(0, caret), this.limit()).length, text.length);
    input.setSelectionRange(caretAt, caretAt);
    this.text.set(text);

    const point = text.indexOf('.');
    if (point >= 0 && text.length - point - 1 === COORDINATE_DECIMALS) {
      this.commit();
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const pair = parseCoordinatePair(event.clipboardData?.getData('text') ?? '');
    if (pair) {
      event.preventDefault();
      this.pairPasted.emit(pair);
    }
  }

  /** Passes a valid typed value on */
  protected commit(): void {
    const value = parseCoordinate(this.text(), this.limit());
    if (value !== null && !sameCoordinate(value, this.value())) {
      this.value.set(Math.round(value * PRECISION) / PRECISION);
    }
  }

  protected onBlur(): void {
    this.touched.set(true);
    this.commit();
  }
}
