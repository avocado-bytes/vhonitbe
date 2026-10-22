import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService, TranslationObject } from '@ngx-translate/core';
import { map } from 'rxjs';
import { selectLanguage } from '../state/settings/settings.reducer';

/**
 * The guide's texts are kept apart from the app's translations, in /i18n/guide/<language>.json,
 * so they are only downloaded when the guide is opened. Per translation service, the languages that
 * have them merged in already.
 */
const loadedLanguages = new WeakMap<TranslateService, Set<string>>();

interface GuideSection {
  /** Key of the section in the GUIDE translations, also its anchor */
  id: string;
  /** Names of the phone screenshots in public/guide/<language>/, each with a caption in GUIDE.SHOTS */
  screenshots: readonly string[];
}

/** The sections in reading order; their texts are in the GUIDE translations */
export const GUIDE_SECTIONS: readonly GuideSection[] = [
  { id: 'start', screenshots: [] },
  { id: 'overview', screenshots: ['overview'] },
  { id: 'add-event', screenshots: ['add-event'] },
  { id: 'event-actions', screenshots: ['event-actions'] },
  { id: 'map', screenshots: ['map', 'map-menu'] },
  { id: 'hunting-ground', screenshots: ['hunting-ground-settings', 'hunting-ground-map'] },
  { id: 'feeding', screenshots: ['feeding'] },
  { id: 'replenishing', screenshots: ['feeding-list', 'navigation'] },
  { id: 'firearms', screenshots: ['firearms', 'add-ammunition'] },
  { id: 'load-development', screenshots: ['load-series', 'test-load'] },
  { id: 'settings', screenshots: ['settings'] },
];

/**
 * A user guide with phone screenshots in the selected language. Like its code and its screenshots,
 * its texts are loaded only when it is opened.
 */
@Component({
  imports: [TranslatePipe],
  selector: 'app-guide',
  styleUrl: './guide.scss',
  templateUrl: './guide.html',
})
export class Guide {
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);

  protected readonly sections = GUIDE_SECTIONS;
  protected readonly language = inject(Store).selectSignal(selectLanguage);
  protected readonly status = signal<'loading' | 'loaded' | 'failed'>('loading');
  /**
   * The language whose translations are in use; it changes only once its translations are loaded,
   * so the guide's texts are merged into them rather than replaced by them
   */
  private readonly translationsLanguage = toSignal(this.translate.onLangChange.pipe(map(({ lang }): string | null => lang)), {
    initialValue: this.translate.getCurrentLang(),
  });

  constructor() {
    effect((onCleanup) => {
      const language = this.translationsLanguage();
      if (!language) {
        return;
      }
      const loaded = loadedLanguages.get(this.translate) ?? new Set<string>();
      loadedLanguages.set(this.translate, loaded);
      if (loaded.has(language)) {
        this.status.set('loaded');
        return;
      }
      this.status.set('loading');
      const request = this.http.get<TranslationObject>(`/i18n/guide/${language}.json`).subscribe({
        next: (guide) => {
          this.translate.setTranslation(language, { GUIDE: guide }, true);
          loaded.add(language);
          this.status.set('loaded');
        },
        error: () => this.status.set('failed'),
      });
      onCleanup(() => request.unsubscribe());
    });
  }

  /** Scrolls within the page rather than navigating, so the router stays on the guide */
  protected scrollTo(id: string): void {
    document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
