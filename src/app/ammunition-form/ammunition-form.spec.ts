import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Ammunition } from '../model/ammunition';
import { COMMON_CALIBERS } from '../model/firearm';
import { AmmunitionActions } from '../state/ammunition/ammunition.actions';
import { initialState } from '../state/ammunition/ammunition.reducer';
import { AmmunitionForm } from './ammunition-form';

describe('AmmunitionForm', () => {
  let fixture: ComponentFixture<AmmunitionForm>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const element = () => fixture.nativeElement as HTMLElement;
  const input = (id: string) => element().querySelector(`#${id}`) as HTMLInputElement;
  const submitButton = () => element().querySelector('button[type="submit"]') as HTMLButtonElement;
  const enter = async (id: string, value: string) => {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const fillRequired = async () => {
    await enter('ammunition-caliber', '.308 Win');
    await enter('ammunition-weight', '165');
    await enter('ammunition-velocity', '820');
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmmunitionForm],
      providers: [provideTranslateService({ lang: 'en' }), provideMockStore({ initialState: { ammunition: initialState } })],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      AMMUNITION: {
        SOURCES: { factory: 'Factory', handload: 'Handload' },
        BULLET_TYPES: ['Soft point (SP)', 'Polymer tip'],
        FORM: { SAVE_FAILED: 'Failed', RANGE_INVALID: 'From {{min}} to {{max}}' },
      },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(AmmunitionForm);
    await fixture.whenStable();
  });

  it('should offer the same calibers as for firearms and the common bullet types', () => {
    const options = (id: string) => Array.from(element().querySelectorAll(`#${id} option`)).map((option) => option.getAttribute('value'));

    expect(input('ammunition-caliber').getAttribute('list')).toBe('ammunition-calibers');
    expect(options('ammunition-calibers')).toEqual([...COMMON_CALIBERS]);
    expect(input('ammunition-bullet-type').getAttribute('list')).toBe('ammunition-bullet-types');
    expect(options('ammunition-bullet-types')).toEqual(['Soft point (SP)', 'Polymer tip']);
  });

  it('should choose between factory and handload, factory by default', () => {
    const radios = Array.from(element().querySelectorAll<HTMLInputElement>('input[name="ammunition-source"]'));

    expect(radios.map((radio) => radio.value)).toEqual(['factory', 'handload']);
    expect(radios.map((radio) => radio.checked)).toEqual([true, false]);
  });

  it('should need the caliber, bullet weight and muzzle velocity', async () => {
    expect(submitButton().disabled).toBe(true);

    await enter('ammunition-caliber', '.308 Win');
    await enter('ammunition-weight', '165');
    expect(submitButton().disabled).toBe(true);

    await enter('ammunition-velocity', '820');
    expect(submitButton().disabled).toBe(false);
  });

  it('should point out numbers out of range and not save them', async () => {
    await fillRequired();

    await enter('ammunition-weight', '0');
    expect(input('ammunition-weight').classList).toContain('is-invalid');
    expect(submitButton().disabled).toBe(true);

    await enter('ammunition-weight', '165');
    await enter('ammunition-bc', '3');
    expect(input('ammunition-bc').classList).toContain('is-invalid');
    expect(submitButton().disabled).toBe(true);
  });

  it('should add the ammunition, reading a decimal comma', async () => {
    await fillRequired();
    (element().querySelector('#ammunition-source-handload') as HTMLInputElement).click();
    await enter('ammunition-weight', '165,5');
    await enter('ammunition-bullet-type', ' Nosler Partition ');
    await enter('ammunition-bc', '0,410');
    await fixture.whenStable();

    submitButton().click();

    expect(dispatch).toHaveBeenCalledWith(
      AmmunitionActions.addAmmunition({
        ammunition: {
          caliber: '.308 Win',
          source: 'handload',
          bulletWeight: 165.5,
          muzzleVelocity: 820,
          bulletType: 'Nosler Partition',
          ballisticCoefficient: 0.41,
          primer: '',
          powder: '',
          brass: '',
          brassFirings: null,
          product: '',
          powderCharge: null,
          overallLength: null,
        },
      }),
    );
  });

  it('should save without a bullet type or ballistic coefficient', async () => {
    await fillRequired();

    submitButton().click();

    expect(dispatch).toHaveBeenCalledWith(
      AmmunitionActions.addAmmunition({
        ammunition: {
          caliber: '.308 Win',
          source: 'factory',
          bulletWeight: 165,
          muzzleVelocity: 820,
          bulletType: '',
          ballisticCoefficient: null,
          primer: '',
          powder: '',
          brass: '',
          brassFirings: null,
          product: '',
          powderCharge: null,
          overallLength: null,
        },
      }),
    );
  });

  it('should show an error when saving failed', async () => {
    store.setState({ ammunition: { ...initialState, saveError: 'boom' } });
    await fixture.whenStable();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain('Failed');
  });

  describe('handload', () => {
    const chooseSource = async (value: string) => {
      (element().querySelector(`#ammunition-source-${value}`) as HTMLInputElement).click();
      await fixture.whenStable();
    };

    it('should ask for the primer, powder, brass and its firings only for a handload', async () => {
      const ids = ['ammunition-primer', 'ammunition-powder', 'ammunition-brass', 'ammunition-brass-firings'];
      expect(ids.map((id) => element().querySelector(`#${id}`))).toEqual([null, null, null, null]);

      await chooseSource('handload');
      expect(ids.every((id) => element().querySelector(`#${id}`))).toBe(true);
      expect(input('ammunition-brass-firings').type).toBe('number');

      await chooseSource('factory');
      expect(ids.map((id) => element().querySelector(`#${id}`))).toEqual([null, null, null, null]);
    });

    it('should save the components of a handload', async () => {
      await fillRequired();
      await chooseSource('handload');
      await enter('ammunition-primer', ' CCI 200 ');
      await enter('ammunition-powder', 'Vihtavuori N140');
      await enter('ammunition-brass', 'Lapua');
      await enter('ammunition-brass-firings', '3');

      submitButton().click();

      expect(dispatch).toHaveBeenCalledWith(
        AmmunitionActions.addAmmunition({
          ammunition: expect.objectContaining({
            source: 'handload',
            primer: 'CCI 200',
            powder: 'Vihtavuori N140',
            brass: 'Lapua',
            brassFirings: 3,
          }) as never,
        }),
      );
    });

    it('should count new brass as fired 0 times and refuse a count that is not whole', async () => {
      await fillRequired();
      await chooseSource('handload');

      await enter('ammunition-brass-firings', '0');
      expect(submitButton().disabled).toBe(false);

      for (const invalid of ['1.5', '-1', '100']) {
        await enter('ammunition-brass-firings', invalid);
        expect(input('ammunition-brass-firings').classList, invalid).toContain('is-invalid');
        expect(submitButton().disabled, invalid).toBe(true);
      }
    });

    it('should drop components typed before switching to factory ammunition', async () => {
      await fillRequired();
      await chooseSource('handload');
      await enter('ammunition-primer', 'CCI 200');
      await enter('ammunition-brass-firings', '150');
      await chooseSource('factory');

      expect(submitButton().disabled).toBe(false);
      submitButton().click();

      expect(dispatch).toHaveBeenCalledWith(
        AmmunitionActions.addAmmunition({
          ammunition: expect.objectContaining({ source: 'factory', primer: '', brassFirings: null }) as never,
        }),
      );
    });
  });

  describe('editing ammunition', () => {
    const existing: Ammunition = {
      id: 'x',
      caliber: '.308 Win',
      source: 'handload',
      bulletWeight: 165,
      muzzleVelocity: 820,
      bulletType: 'Nosler Partition',
      ballisticCoefficient: 0.41,
      primer: 'CCI 200',
      powder: 'Vihtavuori N140',
      brass: 'Lapua',
      brassFirings: 2,
    };

    beforeEach(async () => {
      fixture.componentRef.setInput('ammunition', existing);
      await fixture.whenStable();
    });

    it('should prefill the form with the ammunition', () => {
      expect(input('ammunition-caliber').value).toBe('.308 Win');
      expect((element().querySelector('#ammunition-source-handload') as HTMLInputElement).checked).toBe(true);
      expect(input('ammunition-weight').value).toBe('165');
      expect(input('ammunition-velocity').value).toBe('820');
      expect(input('ammunition-bullet-type').value).toBe('Nosler Partition');
      expect(input('ammunition-bc').value).toBe('0.41');
      expect(input('ammunition-primer').value).toBe('CCI 200');
      expect(input('ammunition-powder').value).toBe('Vihtavuori N140');
      expect(input('ammunition-brass').value).toBe('Lapua');
      expect(input('ammunition-brass-firings').value).toBe('2');
    });

    it('should update the ammunition, keeping its id', async () => {
      await enter('ammunition-brass-firings', '3');

      submitButton().click();

      expect(dispatch).toHaveBeenCalledWith(
        AmmunitionActions.updateAmmunition({
          ammunition: { ...existing, brassFirings: 3, product: '', powderCharge: null, overallLength: null },
        }),
      );
    });
  });

  describe('make, charge and length', () => {
    const chooseSource = async (value: string) => {
      (element().querySelector(`#ammunition-source-${value}`) as HTMLInputElement).click();
      await fixture.whenStable();
    };

    it('should ask for the make and product only for factory ammunition', async () => {
      expect(element().querySelector('#ammunition-product')).not.toBeNull();

      await chooseSource('handload');
      expect(element().querySelector('#ammunition-product')).toBeNull();
    });

    it('should save the make and product of factory ammunition', async () => {
      await fillRequired();
      await enter('ammunition-product', ' RWS EVO ');

      submitButton().click();

      expect(dispatch).toHaveBeenCalledWith(
        AmmunitionActions.addAmmunition({
          ammunition: expect.objectContaining({ source: 'factory', product: 'RWS EVO', powderCharge: null, overallLength: null }) as never,
        }),
      );
    });

    it('should save the powder charge and overall length of a handload, reading a decimal comma', async () => {
      await fillRequired();
      await enter('ammunition-product', 'RWS EVO');
      await chooseSource('handload');
      await enter('ammunition-charge', '41,5');
      await enter('ammunition-length', '71.1');

      submitButton().click();

      expect(dispatch).toHaveBeenCalledWith(
        AmmunitionActions.addAmmunition({
          ammunition: expect.objectContaining({ source: 'handload', product: '', powderCharge: 41.5, overallLength: 71.1 }) as never,
        }),
      );
    });

    it('should point out a charge or length out of range', async () => {
      await fillRequired();
      await chooseSource('handload');

      await enter('ammunition-charge', '500');
      expect(input('ammunition-charge').classList).toContain('is-invalid');
      expect(submitButton().disabled).toBe(true);

      await enter('ammunition-charge', '41');
      await enter('ammunition-length', '5');
      expect(input('ammunition-length').classList).toContain('is-invalid');
      expect(submitButton().disabled).toBe(true);
    });
  });
});
