import { LANGUAGE_STORAGE_KEY } from './settings.model';
import { preferredLanguage } from './settings.reducer';

describe('preferredLanguage', () => {
  const browserLanguages = (languages: string[]) => vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should use the language the user chose before the browser languages', () => {
    browserLanguages(['en-US']);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'cs');

    expect(preferredLanguage()).toBe('cs');
  });

  it('should use the first supported browser language without a stored choice', () => {
    browserLanguages(['de-DE', 'cs-CZ', 'en']);

    expect(preferredLanguage()).toBe('cs');
  });

  it('should ignore a stored language that is not supported', () => {
    browserLanguages(['en-GB']);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'xx');

    expect(preferredLanguage()).toBe('en');
  });

  it('should fall back to the browser languages when storage is unavailable', () => {
    browserLanguages(['cs']);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(preferredLanguage()).toBe('cs');
  });
});
