import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { MpbrCalculator, MpbrResult } from '../ballistics/mpbr';
import { Ammunition } from '../model/ammunition';
import { Firearm } from '../model/firearm';
import { AmmunitionActions } from '../state/ammunition/ammunition.actions';
import { initialState as ammunitionInitialState } from '../state/ammunition/ammunition.reducer';
import { FirearmsActions } from '../state/firearms/firearms.actions';
import { initialState as firearmsInitialState } from '../state/firearms/firearms.reducer';
import { Zeroing } from './zeroing';

describe('Zeroing', () => {
  let fixture: ComponentFixture<Zeroing>;
  let store: MockStore;
  const calculate = vi.fn<MpbrCalculator['calculate']>();

  const firearm: Firearm = { id: 'f1', name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope', sightHeight: 45 };
  const ammunition: Ammunition = {
    id: 'a1',
    caliber: '.308 WIN',
    source: 'factory',
    product: 'RWS EVO',
    bulletWeight: 184,
    muzzleVelocity: 770,
    bulletType: '',
    ballisticCoefficient: 0.403,
    primer: '',
    powder: '',
    brass: '',
    brassFirings: null,
  };
  const result: MpbrResult = {
    start: 3,
    end: 195,
    nearZero: 33,
    apex: 102,
    apexHeight: 4,
    zeroingDistance: 35,
    impactAtZeroing: 0.26,
    impactAt100: 3.99,
  };

  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent ?? '';
  const choose = async (id: string, value: string) => {
    const select = element().querySelector(`#${id}`) as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const enter = async (id: string, value: string) => {
    const input = element().querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const setState = (firearms: Firearm[], items: Ammunition[]) =>
    store.setState({
      firearms: { ...firearmsInitialState, firearms },
      ammunition: { ...ammunitionInitialState, ammunition: items },
      settings: { theme: 'light', language: 'en' },
    });

  beforeEach(async () => {
    calculate.mockReset();
    calculate.mockResolvedValue(result);
    await TestBed.configureTestingModule({
      imports: [Zeroing],
      providers: [
        provideRouter([]),
        { provide: MpbrCalculator, useValue: { calculate } },
        provideTranslateService({ lang: 'en' }),
        provideMockStore({
          initialState: {
            firearms: firearmsInitialState,
            ammunition: ammunitionInitialState,
            settings: { theme: 'light', language: 'en' },
          },
        }),
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    setState([firearm], [ammunition]);
    fixture = TestBed.createComponent(Zeroing);
    await fixture.whenStable();
  });

  it('should load the firearms and ammunition to choose from', () => {
    expect(store.dispatch).toHaveBeenCalledWith(FirearmsActions.load());
    expect(store.dispatch).toHaveBeenCalledWith(AmmunitionActions.load());
    const options = (id: string) => Array.from((element().querySelector(`#${id}`) as HTMLSelectElement).options).map((o) => o.textContent?.trim());
    expect(options('zeroing-firearm')).toEqual(['ZEROING.FIREARM_PLACEHOLDER', 'Blaser R8 (.308 Win)']);
    expect(options('zeroing-ammunition')).toEqual(['ZEROING.AMMUNITION_PLACEHOLDER', '.308 WIN · RWS EVO · 184 gr']);
  });

  it('should start with an 8 cm vital zone and a 35 m zeroing distance', () => {
    expect((element().querySelector('#zeroing-vital-zone') as HTMLInputElement).value).toBe('8');
    expect((element().querySelector('#zeroing-distance') as HTMLInputElement).value).toBe('35');
    expect(calculate).not.toHaveBeenCalled();
  });

  it('should calculate the MPBR for the chosen firearm and ammunition and show it', async () => {
    await choose('zeroing-firearm', 'f1');
    await choose('zeroing-ammunition', 'a1');

    expect(calculate).toHaveBeenLastCalledWith({
      muzzleVelocity: 770,
      ballisticCoefficient: 0.403,
      sightHeight: 45,
      vitalZone: 8,
      zeroingDistance: 35,
    });
    expect(element().querySelector('.mpbr-range')?.textContent).toContain('ZEROING.MPBR_FROM_TO');
    expect(element().querySelector('.impact-value')?.textContent?.trim()).toBe('+0.3 cm');
    expect(text()).toContain('ZEROING.ABOVE');
    expect(element().querySelector('.zeroing-details')?.textContent).toContain('33 m');
    expect(element().querySelector('.zeroing-details')?.textContent).toContain('+4.0 cm');
    // Calibers are compared without case and spaces
    expect(text()).not.toContain('ZEROING.CALIBER_MISMATCH');
  });

  it('should recalculate for another vital zone and zeroing distance, accepting a decimal comma', async () => {
    await choose('zeroing-firearm', 'f1');
    await choose('zeroing-ammunition', 'a1');

    await enter('zeroing-vital-zone', '10,5');
    await enter('zeroing-distance', '100');

    expect(calculate).toHaveBeenLastCalledWith(expect.objectContaining({ vitalZone: 10.5, zeroingDistance: 100 }));
  });

  it('should not calculate with a vital zone or distance out of range', async () => {
    await choose('zeroing-firearm', 'f1');
    await choose('zeroing-ammunition', 'a1');
    calculate.mockClear();

    await enter('zeroing-vital-zone', '1');

    expect(element().querySelector('#zeroing-vital-zone')?.classList).toContain('is-invalid');
    expect(calculate).not.toHaveBeenCalled();
  });

  it('should ask for a missing sight height or ballistic coefficient', async () => {
    setState([{ ...firearm, sightHeight: null }], [{ ...ammunition, ballisticCoefficient: null }]);
    await choose('zeroing-firearm', 'f1');
    await choose('zeroing-ammunition', 'a1');

    expect(text()).toContain('ZEROING.MISSING.sight-height');
    expect(text()).toContain('ZEROING.MISSING.ballistic-coefficient');
    expect(calculate).not.toHaveBeenCalled();
  });

  it('should warn when the calibers differ', async () => {
    setState([firearm], [{ ...ammunition, caliber: '7×64' }]);
    await choose('zeroing-firearm', 'f1');
    await choose('zeroing-ammunition', 'a1');

    expect(text()).toContain('ZEROING.CALIBER_MISMATCH');
  });
});
