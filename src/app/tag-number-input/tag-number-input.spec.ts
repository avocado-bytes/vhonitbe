import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagNumberInput } from './tag-number-input';

describe('TagNumberInput', () => {
  let fixture: ComponentFixture<TagNumberInput>;
  let component: TagNumberInput;

  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const ghost = () => (fixture.nativeElement.querySelector('.tag-ghost') as HTMLElement).textContent;
  /** Types like the browser does: changes the value and caret, then fires input */
  const type = async (value: string, caret = value.length, inputType = 'insertText') => {
    input().value = value;
    input().setSelectionRange(caret, caret);
    input().dispatchEvent(new InputEvent('input', { inputType }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TagNumberInput] }).compileComponents();
    fixture = TestBed.createComponent(TagNumberInput);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('inputId', 'tag');
    await fixture.whenStable();
  });

  it('should open the numeric keyboard', () => {
    expect(input().inputMode).toBe('numeric');
    expect(input().id).toBe('tag');
  });

  it('should show the whole mask while empty', () => {
    expect(ghost()).toBe('00 000000');
  });

  it('should add the space after the first section and keep the rest of the mask', async () => {
    await type('12');
    expect(input().value).toBe('12');

    await type('123');

    expect(input().value).toBe('12 3');
    expect(component.value()).toBe('123');
    expect(ghost()?.endsWith('00000')).toBe(true);
    expect(input().selectionStart).toBe(4);
  });

  it('should ignore other characters and digits beyond the eighth', async () => {
    await type('12-3456 78 9x');

    expect(input().value).toBe('12 345678');
    expect(component.value()).toBe('12345678');
  });

  it('should delete the digit before the space with backspace right after it', async () => {
    component.value.set('12345');
    await fixture.whenStable();

    // Backspace right after the space removes just the space from "12 345"
    await type('12345', 2, 'deleteContentBackward');

    expect(component.value()).toBe('1345');
    expect(input().value).toBe('13 45');
    expect(input().selectionStart).toBe(1);
  });
});
