export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const LANGUAGES = ['en', 'cs'] as const;
export type Language = (typeof LANGUAGES)[number];

export interface SettingsState {
  theme: Theme;
  language: Language;
}
