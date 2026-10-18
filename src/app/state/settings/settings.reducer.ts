import { createFeature, createReducer, on } from '@ngrx/store';
import { SettingsActions } from './settings.actions';
import { Language, LANGUAGES, SettingsState, storedLanguage, Theme } from './settings.model';

function preferredTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * The language the user chose earlier, otherwise the first supported language
 * from the browser's preferred languages, falling back to english
 */
export function preferredLanguage(): Language {
  const stored = storedLanguage();
  if (stored) {
    return stored;
  }
  const browserLanguages = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  for (const browserLanguage of browserLanguages) {
    const language = browserLanguage?.split('-')[0].toLowerCase();
    if (LANGUAGES.includes(language as Language)) {
      return language as Language;
    }
  }
  return 'en';
}

export const initialState: SettingsState = {
  theme: preferredTheme(),
  language: preferredLanguage(),
};

export const settingsFeature = createFeature({
  name: 'settings',
  reducer: createReducer(
    initialState,
    on(SettingsActions.setTheme, (state, { theme }): SettingsState => ({ ...state, theme })),
    on(SettingsActions.setLanguage, (state, { language }): SettingsState => ({ ...state, language })),
  ),
});

export const { selectTheme, selectLanguage } = settingsFeature;
