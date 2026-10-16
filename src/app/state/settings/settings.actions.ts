import { createActionGroup, props } from '@ngrx/store';
import { Language, Theme } from './settings.model';

export const SettingsActions = createActionGroup({
  source: 'Settings',
  events: {
    'Set Theme': props<{ theme: Theme }>(),
    'Set Language': props<{ language: Language }>(),
  },
});
