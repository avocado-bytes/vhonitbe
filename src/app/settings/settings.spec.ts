import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { HuntingGround } from '../model/hunting-ground';
import { HuntingGroundActions } from '../state/hunting-ground/hunting-ground.actions';
import { HuntingGroundState, initialState as huntingGroundInitialState } from '../state/hunting-ground/hunting-ground.reducer';
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
        provideMockStore({
          initialState: { settings: { ...initialState, theme: 'light', language: 'en' }, huntingGround: huntingGroundInitialState },
        }),
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

  describe('hunting ground', () => {
    const ground: HuntingGround = {
      code: 'CZ2120404111',
      name: 'BRDY',
      area: 25665,
      outline: [],
      searchedAt: { latitude: 49.72, longitude: 13.95 },
      fetchedAt: '2026-10-01T10:00:00.000Z',
    };
    const element = () => fixture.nativeElement as HTMLElement;
    const button = (text: string) =>
      Array.from(element().querySelectorAll<HTMLButtonElement>('button')).find((candidate) => candidate.textContent?.includes(text));
    const setState = async (huntingGround: Partial<HuntingGroundState>) => {
      store.setState({
        settings: { ...initialState, theme: 'light', language: 'en' },
        huntingGround: { ...huntingGroundInitialState, ...huntingGround },
      });
      await fixture.whenStable();
    };

    it('should look up the hunting ground at the position', () => {
      const dispatch = vi.spyOn(store, 'dispatch');

      button('HUNTING_GROUND.SEARCH')!.click();

      expect(dispatch).toHaveBeenCalledWith(HuntingGroundActions.search());
    });

    it('should offer the hunting grounds found and keep the chosen one', async () => {
      await setState({ candidates: [ground, { ...ground, code: 'CZ2120110031', name: 'Pod Tremošnou' }] });
      const dispatch = vi.spyOn(store, 'dispatch');

      const candidates = element().querySelectorAll<HTMLButtonElement>('.hunting-ground-candidate');
      expect(Array.from(candidates).map((candidate) => candidate.querySelector('.fw-semibold')?.textContent)).toEqual([
        'BRDY',
        'Pod Tremošnou',
      ]);
      candidates[0].click();

      expect(dispatch).toHaveBeenCalledWith(HuntingGroundActions.choose({ ground }));
    });

    it('should say when no hunting ground was found', async () => {
      await setState({ candidates: [] });

      expect(element().querySelector('[role="status"]')?.textContent).toContain('HUNTING_GROUND.NOT_FOUND');
    });

    it('should show the kept hunting ground, and refresh or remove it', async () => {
      await setState({ ground });
      const dispatch = vi.spyOn(store, 'dispatch');
      const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

      expect(element().querySelector('.hunting-ground-name')?.textContent).toContain('BRDY');
      expect(element().querySelector('.hunting-ground-name')?.textContent).toContain('CZ2120404111');

      button('HUNTING_GROUND.REFRESH')!.click();
      expect(dispatch).toHaveBeenCalledWith(HuntingGroundActions.refresh());

      button('HUNTING_GROUND.REMOVE')!.click();
      expect(dispatch).not.toHaveBeenCalledWith(HuntingGroundActions.remove());
      button('HUNTING_GROUND.REMOVE')!.click();
      expect(dispatch).toHaveBeenCalledWith(HuntingGroundActions.remove());
      confirm.mockRestore();
    });

    it('should show why a search failed', async () => {
      await setState({ error: 'location' });

      expect(element().querySelector('[role="alert"]')?.textContent).toContain('HUNTING_GROUND.ERRORS.location');
    });
  });
});
