import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([{ path: 'map', children: [] }]),
        provideTranslateService({ lang: 'en' }),
        provideMockStore({ initialState: { settings: { theme: 'light', language: 'en' } } }),
      ],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('en', {
      APP: { TITLE: 'vHonitbe', ADD: 'Add' },
      HEADER: { MENU: 'Open menu', SETTINGS: 'Settings' },
      NAV: { HOME: 'Home', MAP: 'Map', CLOSE: 'Close navigation' },
    });
  });

  async function createApp() {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector('[aria-controls="settings-menu"]') as HTMLButtonElement;
    const menu = () => element.querySelector('#settings-menu');
    const openMenu = async () => {
      toggle.click();
      await fixture.whenStable();
    };
    return { fixture, element, toggle, menu, openMenu };
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the application name in the toolbar', async () => {
    const { element } = await createApp();
    expect(element.querySelector('header')?.textContent).toContain('vHonitbe');
  });

  it('should render the floating add button', async () => {
    const { element } = await createApp();
    const fab = element.querySelector('button.fab');
    expect(fab?.getAttribute('aria-label')).toBe('Add');
  });

  it('should open the settings menu when the settings icon is clicked', async () => {
    const { toggle, menu, openMenu } = await createApp();
    expect(menu()).toBeNull();

    await openMenu();

    expect(menu()?.querySelector('app-settings')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('should move focus into the settings menu when opened', async () => {
    const { fixture, menu, openMenu } = await createApp();
    document.body.appendChild(fixture.nativeElement);
    await openMenu();

    expect(menu()?.contains(document.activeElement)).toBe(true);
    fixture.nativeElement.remove();
  });

  it('should keep the menu open when clicking inside it', async () => {
    const { fixture, menu, openMenu } = await createApp();
    await openMenu();

    (menu() as HTMLElement).click();
    await fixture.whenStable();

    expect(menu()).not.toBeNull();
  });

  it('should close the menu when clicking outside', async () => {
    const { fixture, element, menu, openMenu } = await createApp();
    await openMenu();

    (element.querySelector('button.fab') as HTMLElement).click();
    await fixture.whenStable();

    expect(menu()).toBeNull();
  });

  it('should close the menu on Escape and return focus to the toggle', async () => {
    const { fixture, toggle, menu, openMenu } = await createApp();
    await openMenu();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  describe('side navigation', () => {
    async function createAppWithSideNav() {
      const app = await createApp();
      const burger = app.element.querySelector('[aria-controls="side-nav"]') as HTMLButtonElement;
      const sideNav = app.element.querySelector('#side-nav') as HTMLElement;
      const backdrop = () => app.element.querySelector('.offcanvas-backdrop') as HTMLElement | null;
      const openSideNav = async () => {
        burger.click();
        await app.fixture.whenStable();
      };
      return { ...app, burger, sideNav, backdrop, openSideNav };
    }

    it('should be hidden until the burger menu is clicked', async () => {
      const { burger, sideNav, backdrop, openSideNav } = await createAppWithSideNav();
      expect(sideNav.classList).not.toContain('show');
      expect(backdrop()).toBeNull();

      await openSideNav();

      expect(sideNav.classList).toContain('show');
      expect(backdrop()).not.toBeNull();
      expect(burger.getAttribute('aria-expanded')).toBe('true');
    });

    it('should move focus into the side navigation when opened', async () => {
      const { fixture, sideNav, openSideNav } = await createAppWithSideNav();
      document.body.appendChild(fixture.nativeElement);
      await openSideNav();

      expect(document.activeElement).toBe(sideNav.querySelector('.btn-close'));
      fixture.nativeElement.remove();
    });

    it('should link to the home and map routes', async () => {
      const { sideNav } = await createAppWithSideNav();
      const links = Array.from(sideNav.querySelectorAll('a.nav-link'));

      expect(links.map((link) => link.textContent?.trim())).toEqual(['Home', 'Map']);
      expect(links.map((link) => link.getAttribute('href'))).toEqual(['/', '/map']);
    });

    it('should close when a link is clicked', async () => {
      const { fixture, sideNav, openSideNav } = await createAppWithSideNav();
      await openSideNav();

      (sideNav.querySelector('a[href="/map"]') as HTMLElement).click();
      await fixture.whenStable();

      expect(sideNav.classList).not.toContain('show');
    });

    it('should close when the backdrop is clicked', async () => {
      const { fixture, sideNav, backdrop, openSideNav } = await createAppWithSideNav();
      await openSideNav();

      backdrop()!.click();
      await fixture.whenStable();

      expect(sideNav.classList).not.toContain('show');
      expect(backdrop()).toBeNull();
    });

    it('should close on Escape and return focus to the burger menu', async () => {
      const { fixture, burger, sideNav, openSideNav } = await createAppWithSideNav();
      await openSideNav();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await fixture.whenStable();

      expect(sideNav.classList).not.toContain('show');
      expect(document.activeElement).toBe(burger);
    });
  });
});
