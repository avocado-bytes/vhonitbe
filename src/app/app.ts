import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Settings } from './settings/settings';
import { FocusTrap } from './shared/focus-trap';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, Settings, FocusTrap],
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

  private readonly settingsMenu = viewChild.required<ElementRef<HTMLElement>>('settingsMenu');
  private readonly settingsToggle = viewChild.required<ElementRef<HTMLButtonElement>>('settingsToggle');
  private readonly sideNavToggle = viewChild.required<ElementRef<HTMLButtonElement>>('sideNavToggle');

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
