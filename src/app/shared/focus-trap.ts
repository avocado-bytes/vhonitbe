import {
  afterNextRender,
  booleanAttribute,
  Directive,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
} from '@angular/core';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps keyboard focus inside the host element while active:
 * focuses the first focusable element on activation and wraps Tab / Shift+Tab.
 */
@Directive({
  selector: '[appFocusTrap]',
  host: { '(keydown)': 'onKeydown($event)' },
})
export class FocusTrap {
  readonly active = input(true, { alias: 'appFocusTrap', transform: booleanAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  constructor() {
    effect(() => {
      if (this.active()) {
        afterNextRender(() => this.focusableElements()[0]?.focus(), { injector: this.injector });
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.active() || event.key !== 'Tab') {
      return;
    }

    const elements = this.focusableElements();
    if (elements.length === 0) {
      event.preventDefault();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    const focused = document.activeElement;

    if (event.shiftKey && focused === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && focused === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements(): HTMLElement[] {
    const elements = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE));
    // Within a radio group only the checked radio is reachable with Tab.
    return elements.filter(
      (element) =>
        !(element instanceof HTMLInputElement && element.type === 'radio' && !element.checked && element.name) ||
        !elements.some(
          (other) => other instanceof HTMLInputElement && other.type === 'radio' && other.name === element.name && other.checked,
        ),
    );
  }
}
