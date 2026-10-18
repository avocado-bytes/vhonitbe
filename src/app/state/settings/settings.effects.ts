import { DOCUMENT, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { tap } from 'rxjs';
import { SettingsActions } from './settings.actions';
import { storeLanguage } from './settings.model';
import { selectLanguage, selectTheme } from './settings.reducer';

export const applyTheme = createEffect(
  (store = inject(Store), document = inject(DOCUMENT)) =>
    store
      .select(selectTheme)
      .pipe(tap((theme) => document.documentElement.setAttribute('data-bs-theme', theme))),
  { functional: true, dispatch: false },
);

export const applyLanguage = createEffect(
  (store = inject(Store), translate = inject(TranslateService), document = inject(DOCUMENT)) =>
    store.select(selectLanguage).pipe(
      tap((language) => {
        translate.use(language);
        document.documentElement.lang = language;
      }),
    ),
  { functional: true, dispatch: false },
);

/** Remembers only a language the user chose, not one taken from the browser */
export const rememberLanguage = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(SettingsActions.setLanguage),
      tap(({ language }) => storeLanguage(language)),
    ),
  { functional: true, dispatch: false },
);
