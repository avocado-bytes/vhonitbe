export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const LANGUAGES = ['en', 'cs'] as const;
export type Language = (typeof LANGUAGES)[number];

export interface SettingsState {
  theme: Theme;
  language: Language;
}

/** Where the language chosen by the user is kept, so it wins over the browser's languages on the next visit */
export const LANGUAGE_STORAGE_KEY = 'vhonitbe.language';

/** The language the user chose earlier, if any; storage may be unavailable, e.g. in private windows */
export function storedLanguage(): Language | null {
  try {
    const language = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGES.includes(language as Language) ? (language as Language) : null;
  } catch {
    return null;
  }
}

export function storeLanguage(language: Language): void {
  try {
    globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Without storage the choice only lasts until the app is closed
  }
}
