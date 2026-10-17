import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import * as eventsEffects from './state/events/events.effects';
import { eventsFeature } from './state/events/events.reducer';
import * as locationEffects from './state/location/location.effects';
import { locationFeature } from './state/location/location.reducer';
import * as settingsEffects from './state/settings/settings.effects';
import { settingsFeature } from './state/settings/settings.reducer';
import * as shootingSafetyEffects from './state/shooting-safety/shooting-safety.effects';
import { shootingSafetyFeature } from './state/shooting-safety/shooting-safety.reducer';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideStore(),
    provideState(settingsFeature),
    provideState(locationFeature),
    provideState(eventsFeature),
    provideState(shootingSafetyFeature),
    provideEffects(settingsEffects, locationEffects, eventsEffects, shootingSafetyEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
      fallbackLang: 'en',
      lang: 'en',
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
