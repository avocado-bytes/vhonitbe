import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeoPoint } from '../model/event';
import { CoordinateInput, formatCoordinateText, parseCoordinate } from './coordinate-input';

@Component({
  imports: [CoordinateInput],
  template: `
    <app-coordinate-input axis="latitude" inputId="lat" [(value)]="value" [(invalid)]="invalid" (pairPasted)="pasted = $event">
      Invalid latitude
    </app-coordinate-input>
  `,
})
class Host {
  readonly value = signal<number | null>(null);
  readonly invalid = signal(false);
  pasted: GeoPoint | null = null;
}

describe('formatCoordinateText', () => {
  it('should keep a minus, the digits and one decimal point, taking a comma as one', () => {
    expect(formatCoordinateText('-49,12x3.4', 90)).toBe('-49.1234');
    expect(formatCoordinateText(',5', 90)).toBe('0.5');
  });

  it('should start the decimals once the integer part would be too large', () => {
    expect(formatCoordinateText('49123456', 90)).toBe('49.123456');
    expect(formatCoordinateText('141123456', 180)).toBe('141.123456');
    expect(formatCoordinateText('1812', 180)).toBe('18.12');
  });

  it('should drop decimals beyond the sixth', () => {
    expect(formatCoordinateText('14.12345678', 180)).toBe('14.123456');
  });
});

describe('parseCoordinate', () => {
  it('should accept values within the range of the axis', () => {
    expect(parseCoordinate('49.1', 90)).toBe(49.1);
    expect(parseCoordinate('-90', 90)).toBe(-90);
    expect(parseCoordinate('91', 90)).toBeNull();
    expect(parseCoordinate('', 90)).toBeNull();
    expect(parseCoordinate('-', 90)).toBeNull();
  });
});

describe('CoordinateInput', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const ghost = () => (fixture.nativeElement.querySelector('.coordinate-ghost') as HTMLElement).textContent;
  const error = () => fixture.nativeElement.querySelector('.invalid-feedback') as HTMLElement | null;
  /** Types like the browser does: changes the value and caret, then fires input */
  const type = async (value: string, caret = value.length, inputType = 'insertText') => {
    input().value = value;
    input().setSelectionRange(caret, caret);
    input().dispatchEvent(new InputEvent('input', { inputType }));
    await fixture.whenStable();
  };
  const paste = (text: string) => {
    const event = new Event('paste', { cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
    input().dispatchEvent(event);
    return event;
  };
  const leave = async () => {
    input().dispatchEvent(new Event('change'));
    input().dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should open the decimal keyboard and show the whole mask while empty', () => {
    expect(input().inputMode).toBe('decimal');
    expect(input().id).toBe('lat');
    expect(ghost()).toBe('00.000000');
  });

  it('should add the decimal point and pass the value on once all decimals are typed', async () => {
    await type('49');
    expect(ghost()?.endsWith('.000000')).toBe(true);

    await type('49123');
    expect(input().value).toBe('49.123');
    expect(ghost()?.endsWith('000')).toBe(true);
    expect(host.value()).toBeNull();

    await type('49.123456');
    expect(host.value()).toBe(49.123456);
    expect(host.invalid()).toBe(false);
  });

  it('should pass a shorter value on when leaving the field, and keep its text', async () => {
    await type('49,5');
    await leave();

    expect(host.value()).toBe(49.5);
    expect(input().value).toBe('49.5');
  });

  it('should show a value set from outside with all its decimals', async () => {
    host.value.set(50.1);
    await fixture.whenStable();

    expect(input().value).toBe('50.100000');
  });

  it('should point out an invalid value once the user leaves the field', async () => {
    host.value.set(49);
    await fixture.whenStable();
    await type('');
    expect(host.invalid()).toBe(true);
    expect(error()).toBeNull();

    await leave();

    expect(error()?.textContent).toContain('Invalid latitude');
    expect(input().classList).toContain('is-invalid');
    expect(input().getAttribute('aria-describedby')).toBe('lat-error');
    expect(host.value()).toBe(49);
  });

  it('should delete the digit before the point that was added on its own with backspace right after it', async () => {
    await type('49.1');

    // Backspace right after the point removes just the point from "49.1"
    await type('491', 2, 'deleteContentBackward');

    expect(input().value).toBe('41');
    expect(input().selectionStart).toBe(1);
  });

  it('should pass a pasted position on as a pair instead of pasting it', () => {
    const event = paste('49.7215067N, 13.9512006E');

    expect(event.defaultPrevented).toBe(true);
    expect(host.pasted).toEqual({ latitude: 49.721507, longitude: 13.951201 });
  });

  it('should let a single pasted number be pasted as usual', () => {
    const event = paste('49.7215');

    expect(event.defaultPrevented).toBe(false);
    expect(host.pasted).toBeNull();
  });
});
