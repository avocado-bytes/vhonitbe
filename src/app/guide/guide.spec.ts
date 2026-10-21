import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Guide, GUIDE_SECTIONS } from './guide';

describe('Guide', () => {
  let fixture: ComponentFixture<Guide>;
  let http: HttpTestingController;
  let translate: TranslateService;

  const element = () => fixture.nativeElement as HTMLElement;
  const guideTexts = (title: string) => ({
    INTRO: `${title} intro`,
    map: { TITLE: title, TEXT: `${title} text`, STEPS: ['First step', 'Second step'] },
    SHOTS: { overview: `${title} overview` },
  });
  const create = async () => {
    fixture = TestBed.createComponent(Guide);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Guide],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'cs' }),
        provideMockStore({ initialState: { settings: { theme: 'light', language: 'cs' } } }),
      ],
    }).compileComponents();
    translate = TestBed.inject(TranslateService);
    // The app's own translations, loaded at startup, which hold only the heading and the loading messages
    translate.setTranslation('cs', { NAV: { GUIDE: 'Návod' }, GUIDE_PAGE: { LOADING: 'Načítání návodu…', LOAD_FAILED: 'Selhalo' } });
    translate.setTranslation('en', { NAV: { GUIDE: 'User guide' }, GUIDE_PAGE: { LOADING: 'Loading…' } });
    http = TestBed.inject(HttpTestingController);
    await create();
  });

  afterEach(() => http.verify());

  it('should load its texts only once opened, showing its heading meanwhile', async () => {
    const request = http.expectOne('/i18n/guide/cs.json');
    expect(element().querySelector('h1')?.textContent).toContain('Návod');
    expect(element().querySelector('[role="status"]')?.textContent).toContain('Načítání návodu…');
    expect(element().querySelector('section.guide-section')).toBeNull();

    request.flush(guideTexts('Mapa'));
    await fixture.whenStable();

    expect(element().querySelector('[role="status"]')).toBeNull();
    expect(element().querySelectorAll('section.guide-section')).toHaveLength(GUIDE_SECTIONS.length);
  });

  it('should merge its texts into the app\'s translations rather than replace them', async () => {
    http.expectOne('/i18n/guide/cs.json').flush(guideTexts('Mapa'));
    await fixture.whenStable();

    expect(translate.instant('GUIDE.map.TITLE')).toBe('Mapa');
    expect(translate.instant('NAV.GUIDE')).toBe('Návod');
  });

  it('should show the title, text and steps of a section', async () => {
    http.expectOne('/i18n/guide/cs.json').flush(guideTexts('Mapa'));
    await fixture.whenStable();
    const map = element().querySelector('#guide-map') as HTMLElement;

    expect(map.querySelector('h2')?.textContent).toContain('Mapa');
    expect(map.querySelector('p')?.textContent).toContain('Mapa text');
    expect(Array.from(map.querySelectorAll('li')).map((li) => li.textContent?.trim())).toEqual(['First step', 'Second step']);
  });

  it('should show lazily loaded screenshots in the selected language with captions', async () => {
    http.expectOne('/i18n/guide/cs.json').flush(guideTexts('Mapa'));
    await fixture.whenStable();
    const image = () => element().querySelector('#guide-overview img') as HTMLImageElement;

    expect(image().getAttribute('src')).toBe('guide/cs/overview.jpg');
    expect(image().alt).toBe('Mapa overview');
    expect(image().getAttribute('loading')).toBe('lazy');

    TestBed.inject(MockStore).setState({ settings: { theme: 'light', language: 'en' } });
    await fixture.whenStable();
    expect(image().getAttribute('src')).toBe('guide/en/overview.jpg');
  });

  it('should load the texts of a language switched to, once its translations are in use', async () => {
    http.expectOne('/i18n/guide/cs.json').flush(guideTexts('Mapa'));
    await fixture.whenStable();

    translate.use('en');
    await fixture.whenStable();
    http.expectOne('/i18n/guide/en.json').flush(guideTexts('Map'));
    await fixture.whenStable();

    expect(element().querySelector('#guide-map h2')?.textContent).toContain('Map');
  });

  it('should not download the texts again when opened again', async () => {
    http.expectOne('/i18n/guide/cs.json').flush(guideTexts('Mapa'));
    fixture.destroy();

    await create();

    http.expectNone('/i18n/guide/cs.json');
    expect(element().querySelectorAll('section.guide-section')).toHaveLength(GUIDE_SECTIONS.length);
  });

  it('should say so when its texts cannot be loaded', async () => {
    http.expectOne('/i18n/guide/cs.json').flush('offline', { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain('Selhalo');
    expect(element().querySelector('section.guide-section')).toBeNull();
  });
});
