import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Subject } from 'rxjs';
import { SettingsActions } from './settings.actions';
import { rememberLanguage } from './settings.effects';
import { LANGUAGE_STORAGE_KEY } from './settings.model';

describe('rememberLanguage', () => {
  let actions$: Subject<Action>;

  beforeEach(() => {
    actions$ = new Subject<Action>();
    TestBed.configureTestingModule({ providers: [provideMockActions(() => actions$)] });
    TestBed.runInInjectionContext(() => rememberLanguage().subscribe());
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should store the language the user selected', () => {
    actions$.next(SettingsActions.setLanguage({ language: 'cs' }));

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('cs');
  });

  it('should keep working when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });

    expect(() => actions$.next(SettingsActions.setLanguage({ language: 'en' }))).not.toThrow();
  });
});
