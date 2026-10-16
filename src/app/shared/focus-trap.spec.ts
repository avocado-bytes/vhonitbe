import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FocusTrap } from './focus-trap';

@Component({
  imports: [FocusTrap],
  template: `
    <button id="outside">outside</button>
    <div [appFocusTrap]="active()">
      <button id="first">first</button>
      <input id="radio-a" type="radio" name="group" />
      <input id="radio-b" type="radio" name="group" checked />
      <button id="last">last</button>
    </div>
  `,
})
class Host {
  readonly active = signal(false);
}

describe('FocusTrap', () => {
  let fixture: ComponentFixture<Host>;
  const byId = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
  const tab = (target: HTMLElement, shiftKey = false) => {
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
  });

  afterEach(() => fixture.nativeElement.remove());

  async function activate() {
    fixture.componentInstance.active.set(true);
    await fixture.whenStable();
  }

  it('should focus the first focusable element when activated', async () => {
    await activate();
    expect(document.activeElement).toBe(byId('first'));
  });

  it('should not move focus or trap Tab while inactive', async () => {
    byId('outside').focus();
    byId('last').focus();
    const event = tab(byId('last'));
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(byId('last'));
  });

  it('should wrap Tab from the last element to the first', async () => {
    await activate();
    byId('last').focus();

    const event = tab(byId('last'));

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('first'));
  });

  it('should wrap Shift+Tab from the first element to the last', async () => {
    await activate();

    const event = tab(byId('first'), true);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('last'));
  });

  it('should let the browser handle Tab between inner elements', async () => {
    await activate();

    const event = tab(byId('first'));

    expect(event.defaultPrevented).toBe(false);
  });
});
