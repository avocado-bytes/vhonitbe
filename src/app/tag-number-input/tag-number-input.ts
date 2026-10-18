import { Component, computed, input, model, output } from '@angular/core';
import { formatTagNumber, TAG_DIGITS, TAG_PREFIX_DIGITS } from '../shared/tag-number';

/** The full mask shown faintly behind the input; the typed part covers its start */
const MASK = formatTagNumber('0'.repeat(TAG_DIGITS));

/**
 * A text field for a tag number. It opens the numeric keyboard, accepts only digits (also when pasted),
 * adds the space between the two sections on its own and shows the digits still missing as a faint mask.
 */
@Component({
  selector: 'app-tag-number-input',
  styleUrl: './tag-number-input.scss',
  templateUrl: './tag-number-input.html',
})
export class TagNumberInput {
  /** The digits entered so far, without the space */
  readonly value = model('');
  readonly inputId = input.required<string>();
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);
  /** Emits when the user leaves the field, so an incomplete number is only pointed out afterwards */
  readonly blurred = output<void>();

  protected readonly formatted = computed(() => formatTagNumber(this.value()));
  protected readonly ghost = computed(() => MASK.slice(this.formatted().length));
  protected readonly maxLength = MASK.length;

  protected onInput(input: HTMLInputElement, event: Event): void {
    const caret = input.selectionStart ?? input.value.length;
    let digitsBeforeCaret = input.value.slice(0, caret).replace(/\D/g, '').length;
    let digits = input.value.replace(/\D/g, '');
    // Backspace right after the space only removed the space; remove the digit before it instead
    if ((event as InputEvent).inputType === 'deleteContentBackward' && digits === this.value() && digitsBeforeCaret > 0) {
      digits = digits.slice(0, digitsBeforeCaret - 1) + digits.slice(digitsBeforeCaret);
      digitsBeforeCaret--;
    }
    digits = digits.slice(0, TAG_DIGITS);

    // Set right away, so the caret can be placed in the reformatted value
    input.value = formatTagNumber(digits);
    const position = Math.min(digitsBeforeCaret, digits.length);
    const caretAt = position > TAG_PREFIX_DIGITS ? position + 1 : position;
    input.setSelectionRange(caretAt, caretAt);
    this.value.set(digits);
  }
}
