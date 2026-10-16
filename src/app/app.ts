import { afterNextRender, Component, effect, ElementRef, inject, Injector, signal, untracked, viewChild } from '@angular/core';
import { isActive, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { AddItem } from './add-item/add-item';
import { Settings } from './settings/settings';
import { FocusTrap } from './shared/focus-trap';
import { EventsActions } from './state/events/events.actions';
import { selectEditing } from './state/events/events.reducer';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, Settings, FocusTrap, AddItem],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class App {
  protected readonly settingsOpen = signal(false);
  protected readonly sideNavOpen = signal(false);
  protected readonly addItemOpen = signal(false);

  private readonly store = inject(Store);
  /** The event being edited in the add item dialog, if any */
  protected readonly editing = this.store.selectSignal(selectEditing);

  private readonly injector = inject(Injector);
  private readonly isRootActive = isActive('/', inject(Router), {
    paths: 'exact',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored',
  });

  private readonly settingsMenu = viewChild.required<ElementRef<HTMLElement>>('settingsMenu');
  private readonly settingsToggle = viewChild.required<ElementRef<HTMLButtonElement>>('settingsToggle');
  private readonly sideNavToggle = viewChild.required<ElementRef<HTMLButtonElement>>('sideNavToggle');
  private readonly addItemDialog = viewChild.required<ElementRef<HTMLDialogElement>>('addItemDialog');

  constructor() {
    // Editing an event re-uses the add item dialog
    effect(() => {
      if (this.editing() && !untracked(this.addItemOpen)) {
        this.showAddItemDialog();
      }
    });
  }

  /** The add item dialog is only available on the root url */
  protected openAddItem(): void {
    if (this.isRootActive()) {
      this.showAddItemDialog();
    }
  }

  protected closeAddItem(): void {
    this.addItemDialog().nativeElement.close();
  }

  protected onAddItemClosed(): void {
    this.addItemOpen.set(false);
    if (this.editing()) {
      this.store.dispatch(EventsActions.cancelEdit());
    }
  }

  private showAddItemDialog(): void {
    this.addItemOpen.set(true);
    // Open once the content is rendered, so focus moves to its first focusable element
    afterNextRender(() => this.addItemDialog().nativeElement.showModal(), { injector: this.injector });
  }

  protected openSideNav(): void {
    this.sideNavOpen.set(true);
  }

  protected closeSideNav(): void {
    this.sideNavOpen.set(false);
  }

  protected toggleSettings(): void {
    this.settingsOpen.update((open) => !open);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.settingsOpen() && !this.settingsMenu().nativeElement.contains(event.target as Node)) {
      this.settingsOpen.set(false);
    }
  }

  protected onEscape(): void {
    if (this.sideNavOpen()) {
      this.sideNavOpen.set(false);
      this.sideNavToggle().nativeElement.focus();
    } else if (this.settingsOpen()) {
      this.settingsOpen.set(false);
      this.settingsToggle().nativeElement.focus();
    }
  }
}
