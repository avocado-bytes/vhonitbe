import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { COMMON_CALIBERS } from '../model/firearm';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import { initialState } from '../state/handloading/handloading.reducer';
import { LoadSeriesForm } from './load-series-form';

describe('LoadSeriesForm', () => {
  let fixture: ComponentFixture<LoadSeriesForm>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const element = () => fixture.nativeElement as HTMLElement;
  const caliber = () => element().querySelector('#load-series-caliber') as HTMLInputElement;
  const submitButton = () => element().querySelector('button[type="submit"]') as HTMLButtonElement;
  const enterCaliber = async (value: string) => {
    caliber().value = value;
    caliber().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadSeriesForm],
      providers: [provideTranslateService({ lang: 'en' }), provideMockStore({ initialState: { handloading: initialState } })],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', { HANDLOADING: { FORM: { SAVE_FAILED: 'Failed' } } });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(LoadSeriesForm);
    await fixture.whenStable();
  });

  it('should offer the same common calibers as for firearms', () => {
    const options = Array.from(element().querySelectorAll('#load-series-calibers option')).map((option) => option.getAttribute('value'));

    expect(caliber().getAttribute('list')).toBe('load-series-calibers');
    expect(options).toEqual([...COMMON_CALIBERS]);
  });

  it('should need a caliber', async () => {
    expect(submitButton().disabled).toBe(true);

    await enterCaliber('   ');
    expect(submitButton().disabled).toBe(true);

    await enterCaliber('7×72 R');
    expect(submitButton().disabled).toBe(false);
  });

  it('should start a series with the trimmed caliber', async () => {
    await enterCaliber(' .308 Win ');

    submitButton().click();

    expect(dispatch).toHaveBeenCalledWith(HandloadingActions.addSeries({ series: { caliber: '.308 Win' } }));
  });

  it('should show an error when saving failed', async () => {
    store.setState({ handloading: { ...initialState, saveError: 'boom' } });
    await fixture.whenStable();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain('Failed');
  });
});
