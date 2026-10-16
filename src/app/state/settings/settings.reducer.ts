import { createFeature, createReducer, on } from '@ngrx/store';
import { SettingsActions } from './settings.actions';
import { SettingsState, Theme } from './settings.model';

function preferredTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export const initialState: SettingsState = {
  theme: preferredTheme(),
  language: 'en',
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
