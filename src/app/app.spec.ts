import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { EMPTY } from 'rxjs';
import { HuntingEvent } from './model/event';
import { EventsActions } from './state/events/events.actions';
import { initialState as eventsInitialState } from './state/events/events.reducer';
import { initialState as feedingInitialState } from './state/feeding/feeding.reducer';
import { initialState as locationInitialState } from './state/location/location.reducer';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'map', children: [] },
          { path: 'feeding', children: [] },
        ]),
        provideTranslateService({ lang: 'en' }),
        provideMockStore({
          initialState: {
            settings: { theme: 'light', language: 'en' },
            events: eventsInitialState,
            feeding: feedingInitialState,
            location: locationInitialState,
          },
        }),
        provideMockActions(() => EMPTY),
      ],
    }).compileComponents();

    TestBed.inject(TranslateService).setTranslation('en', {
      APP: { TITLE: 'vHonitbě', ADD: 'Add' },
      HEADER: { MENU: 'Open menu', MENU_ATTENTION: 'Open menu, {{count}} feeding places need replenishing', SETTINGS: 'Settings' },
      NAV: { HOME: 'Home', MAP: 'Map', FEEDING: 'Feeding', CLOSE: 'Close navigation' },
      ADD_ITEM: { TITLE: 'Add item', EDIT_TITLE: 'Edit event', CLOSE: 'Close' },
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
    expect(element.querySelector('header')?.textContent).toContain('vHonitbě');
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

    it('should link to the home, map and feeding routes', async () => {
      const { sideNav } = await createAppWithSideNav();
      const links = Array.from(sideNav.querySelectorAll('a.nav-link'));

      expect(links.map((link) => link.textContent?.trim())).toEqual(['Home', 'Map', 'Feeding']);
      expect(links.map((link) => link.getAttribute('href'))).toEqual(['/', '/map', '/feeding']);
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

  describe('add item dialog', () => {
    // jsdom does not implement HTMLDialogElement.showModal()/close()
    beforeAll(() => {
      HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
      HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    });

    async function createAppWithDialog() {
      const app = await createApp();
      const fab = app.element.querySelector('button.fab') as HTMLButtonElement;
      const dialog = app.element.querySelector('dialog.add-item-dialog') as HTMLDialogElement;
      const clickFab = async () => {
        fab.click();
        await app.fixture.whenStable();
      };
      return { ...app, fab, dialog, clickFab };
    }

    it('should open as a modal with the add item component on the root url', async () => {
      const { dialog, clickFab } = await createAppWithDialog();
      expect(dialog.open).toBe(false);
      expect(dialog.querySelector('app-add-item')).toBeNull();

      await clickFab();

      expect(dialog.open).toBe(true);
      expect(dialog.querySelector('app-add-item')).not.toBeNull();
      expect(dialog.querySelector('#add-item-title')?.textContent).toContain('Add item');
    });

    it('should hide the add button on the feeding page, which has its own', async () => {
      const { fixture, element } = await createAppWithDialog();
      await TestBed.inject(Router).navigateByUrl('/feeding');
      await fixture.whenStable();

      expect(element.querySelector('button.fab')).toBeNull();
    });

    it('should not open on other urls', async () => {
      const { fixture, dialog, clickFab } = await createAppWithDialog();
      await TestBed.inject(Router).navigateByUrl('/map');
      await fixture.whenStable();

      await clickFab();

      expect(dialog.open).toBe(false);
    });

    it('should close with the close button', async () => {
      const { fixture, dialog, clickFab } = await createAppWithDialog();
      await clickFab();

      (dialog.querySelector('.btn-close') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(dialog.open).toBe(false);
      expect(dialog.querySelector('app-add-item')).toBeNull();
    });
  });

  describe('editing an event', () => {
    const existing: HuntingEvent = {
    id: 'id-1',
    type: 'harvest',
    animal: 'wild-boar',
    location: { latitude: 49, longitude: 13.5 },
    note: 'Clean shot',
    occurredAt: '2026-10-01T06:30:00.000Z',
    createdAt: '2026-10-01T06:31:00.000Z',
    updatedAt: '2026-10-01T06:31:00.000Z',
  };

    async function startEditing() {
      const app = await createApp();
      const store = TestBed.inject(MockStore);
      const dispatch = vi.spyOn(store, 'dispatch');
      const dialog = app.element.querySelector('dialog.add-item-dialog') as HTMLDialogElement;
      store.setState({
        settings: { theme: 'light', language: 'en' },
        events: { ...eventsInitialState, editing: existing },
        feeding: feedingInitialState,
        location: locationInitialState,
      });
      await app.fixture.whenStable();
      return { ...app, store, dispatch, dialog };
    }

    it('should open the add item dialog with the event to edit', async () => {
      const { dialog } = await startEditing();

      expect(dialog.open).toBe(true);
      expect(dialog.querySelector('#add-item-title')?.textContent).toContain('Edit event');
      expect((dialog.querySelector('#add-item-type') as HTMLSelectElement).value).toBe('harvest');
    });

    it('should cancel editing when the dialog is closed', async () => {
      const { fixture, dialog, dispatch } = await startEditing();

      (dialog.querySelector('.btn-close') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(dialog.open).toBe(false);
      expect(dispatch).toHaveBeenCalledWith(EventsActions.cancelEdit());
    });

    it('should not dispatch cancelEdit when closing the add dialog', async () => {
      const { fixture, element } = await createApp();
      const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
      const dialog = element.querySelector('dialog.add-item-dialog') as HTMLDialogElement;
      (element.querySelector('button.fab') as HTMLButtonElement).click();
      await fixture.whenStable();

      (dialog.querySelector('.btn-close') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(dispatch).not.toHaveBeenCalledWith(EventsActions.cancelEdit());
    });
  });

  describe('feeding attention', () => {
    const settings = { seasonStart: 10, seasonEnd: 3, replenishDays: 5 };
    const place = (id: string, lastReplenishedAt: string | null) => ({
      id,
      type: 'feeding' as const,
      location: null,
      note: '',
      photoId: null,
      lastReplenishedAt,
    });

    afterEach(() => vi.useRealTimers());

    async function createWithPlaces(now: Date) {
      vi.useFakeTimers({ now, toFake: ['Date'] });
      const app = await createApp();
      TestBed.inject(MockStore).setState({
        settings: { theme: 'light', language: 'en' },
        events: eventsInitialState,
        feeding: {
          ...feedingInitialState,
          settings,
          places: [place('never', null), place('due', '2026-10-01T08:00:00.000Z'), place('fresh', '2026-10-19T08:00:00.000Z')],
        },
        location: locationInitialState,
      });
      await app.fixture.whenStable();
      const burger = app.element.querySelector('[aria-controls="side-nav"]') as HTMLButtonElement;
      const feedingLink = app.element.querySelector('a[routerLink="/feeding"]') as HTMLAnchorElement;
      return { ...app, burger, feedingLink };
    }

    it('should mark the menu button and the feeding link with a dot while places need replenishing in the season', async () => {
      const { burger, feedingLink } = await createWithPlaces(new Date('2026-10-20T12:00:00.000Z'));

      expect(burger.querySelector('.attention-dot')).not.toBeNull();
      expect(burger.getAttribute('aria-label')).toBe('Open menu, 2 feeding places need replenishing');
      expect(feedingLink.querySelector('.nav-attention-dot')).not.toBeNull();
      expect(feedingLink.querySelector('.nav-attention-dot')?.textContent).not.toMatch(/\d/);
    });

    it('should not mark anything outside of the feeding season', async () => {
      const { burger, feedingLink } = await createWithPlaces(new Date('2026-07-01T12:00:00.000Z'));

      expect(burger.querySelector('.attention-dot')).toBeNull();
      expect(burger.getAttribute('aria-label')).toBe('Open menu');
      expect(feedingLink.querySelector('.nav-attention-dot')).toBeNull();
    });
  });
});
