import { Component, computed, DOCUMENT, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HuntingGround } from '../model/hunting-ground';
import { HuntingGroundActions } from '../state/hunting-ground/hunting-ground.actions';
import { selectBusy, selectCandidates, selectError, selectGround } from '../state/hunting-ground/hunting-ground.reducer';
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
  private readonly translate = inject(TranslateService);
  private readonly window = inject(DOCUMENT).defaultView;

  protected readonly version = version;
  protected readonly themes = THEMES;
  protected readonly languages = LANGUAGES;
  protected readonly theme = this.store.selectSignal(selectTheme);
  protected readonly language = this.store.selectSignal(selectLanguage);

  protected readonly ground = this.store.selectSignal(selectGround);
  protected readonly candidates = this.store.selectSignal(selectCandidates);
  protected readonly busy = this.store.selectSignal(selectBusy);
  protected readonly error = this.store.selectSignal(selectError);

  private readonly areaFormat = computed(() => new Intl.NumberFormat(this.language(), { maximumFractionDigits: 0 }));
  private readonly dateFormat = computed(() => new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium' }));

  protected setTheme(theme: Theme): void {
    this.store.dispatch(SettingsActions.setTheme({ theme }));
  }

  protected setLanguage(language: string): void {
    this.store.dispatch(SettingsActions.setLanguage({ language: language as Language }));
  }

  protected area(ground: HuntingGround): string | null {
    return ground.area === null ? null : this.areaFormat().format(ground.area);
  }

  protected fetchedAt(ground: HuntingGround): string {
    return this.dateFormat().format(new Date(ground.fetchedAt));
  }

  protected searchHuntingGround(): void {
    this.store.dispatch(HuntingGroundActions.search());
  }

  protected chooseHuntingGround(ground: HuntingGround): void {
    this.store.dispatch(HuntingGroundActions.choose({ ground }));
  }

  protected cancelSearch(): void {
    this.store.dispatch(HuntingGroundActions.cancelSearch());
  }

  protected refreshHuntingGround(): void {
    this.store.dispatch(HuntingGroundActions.refresh());
  }

  protected removeHuntingGround(): void {
    if (this.window?.confirm(this.translate.instant('HUNTING_GROUND.REMOVE_CONFIRM'))) {
      this.store.dispatch(HuntingGroundActions.remove());
    }
  }
}
