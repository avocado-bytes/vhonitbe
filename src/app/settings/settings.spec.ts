import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { SettingsActions } from '../state/settings/settings.actions';
import { initialState } from '../state/settings/settings.reducer';
import { Settings } from './settings';

describe('Settings', () => {
  let component: Settings;
  let fixture: ComponentFixture<Settings>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({ initialState: { settings: { ...initialState, theme: 'light', language: 'en' } } }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch setTheme when a theme is selected', () => {
    const dispatch = vi.spyOn(store, 'dispatch');
    const dark = fixture.nativeElement.querySelector('#theme-dark') as HTMLInputElement;
    dark.click();
    expect(dispatch).toHaveBeenCalledWith(SettingsActions.setTheme({ theme: 'dark' }));
  });

  it('should dispatch setLanguage when a language is selected', () => {
    const dispatch = vi.spyOn(store, 'dispatch');
    const select = fixture.nativeElement.querySelector('#language') as HTMLSelectElement;
    select.value = 'cs';
    select.dispatchEvent(new Event('change'));
    expect(dispatch).toHaveBeenCalledWith(SettingsActions.setLanguage({ language: 'cs' }));
  });
});
