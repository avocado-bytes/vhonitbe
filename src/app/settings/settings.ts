import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { SettingsActions } from '../state/settings/settings.actions';
import { Language, LANGUAGES, Theme, THEMES } from '../state/settings/settings.model';
import { selectLanguage, selectTheme } from '../state/settings/settings.reducer';
import { version } from '../../../package.json';

@Component({
  imports: [TranslatePipe],
  selector: 'app-settings',
  styleUrl: './settings.scss',
  templateUrl: './settings.html',
})
export class Settings {
  private readonly store = inject(Store);

  protected readonly version = version;
  protected readonly themes = THEMES;
  protected readonly languages = LANGUAGES;
  protected readonly theme = this.store.selectSignal(selectTheme);
  protected readonly language = this.store.selectSignal(selectLanguage);

  protected setTheme(theme: Theme): void {
    this.store.dispatch(SettingsActions.setTheme({ theme }));
  }

  protected setLanguage(language: string): void {
    this.store.dispatch(SettingsActions.setLanguage({ language: language as Language }));
  }
}
