import { Component, ElementRef, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FocusTrap } from '../shared/focus-trap';

export type MapMenuItem = 'add-item' | 'edit-item' | 'delete-item';

/** The actions for an empty point on the map */
export const POINT_MENU_ITEMS: readonly MapMenuItem[] = ['add-item'];

/** The actions for an event marker */
export const EVENT_MENU_ITEMS: readonly MapMenuItem[] = ['edit-item', 'delete-item'];

/** A context menu listing the actions available for a point on the map */
@Component({
  imports: [TranslatePipe, FocusTrap],
  selector: 'app-map-menu',
  styleUrl: './map-menu.scss',
  templateUrl: './map-menu.html',
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:keydown.escape)': 'closed.emit()',
  },
})
export class MapMenu {
  readonly items = input.required<readonly MapMenuItem[]>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly selected = output<MapMenuItem>();
  /** Emits when the menu is dismissed without selecting an item */
  readonly closed = output<void>();

  protected onDocumentPointerDown(event: PointerEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.closed.emit();
    }
  }
}
