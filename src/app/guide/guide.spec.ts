import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Guide, GUIDE_SECTIONS } from './guide';

describe('Guide', () => {
  let fixture: ComponentFixture<Guide>;

  const element = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Guide],
      providers: [
        provideTranslateService({ lang: 'cs' }),
        provideMockStore({ initialState: { settings: { theme: 'light', language: 'cs' } } }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('cs', {
      GUIDE: {
        map: { TITLE: 'Mapa', TEXT: 'Mapa ukazuje, kde jste.', STEPS: ['První krok', 'Druhý krok'] },
        SHOTS: { overview: 'Přehled' },
      },
    });
    fixture = TestBed.createComponent(Guide);
    await fixture.whenStable();
  });

  it('should list every section in the contents and show it', () => {
    expect(element().querySelectorAll('nav li')).toHaveLength(GUIDE_SECTIONS.length);
    expect(element().querySelectorAll('section.guide-section')).toHaveLength(GUIDE_SECTIONS.length);
  });

  it('should show the title, text and steps of a section', () => {
    const map = element().querySelector('#guide-map') as HTMLElement;

    expect(map.querySelector('h2')?.textContent).toContain('Mapa');
    expect(map.querySelector('p')?.textContent).toContain('Mapa ukazuje, kde jste.');
    expect(Array.from(map.querySelectorAll('li')).map((li) => li.textContent?.trim())).toEqual(['První krok', 'Druhý krok']);
  });

  it('should show lazily loaded screenshots in the selected language with captions', async () => {
    const image = () => element().querySelector('#guide-overview img') as HTMLImageElement;

    expect(image().getAttribute('src')).toBe('guide/cs/overview.jpg');
    expect(image().alt).toBe('Přehled');
    expect(image().getAttribute('loading')).toBe('lazy');

    TestBed.inject(MockStore).setState({ settings: { theme: 'light', language: 'en' } });
    await fixture.whenStable();
    expect(image().getAttribute('src')).toBe('guide/en/overview.jpg');
  });
});
