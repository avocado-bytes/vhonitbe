import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { COMMON_CALIBERS, Firearm, OPTICS } from '../model/firearm';
import { FirearmsActions } from '../state/firearms/firearms.actions';
import { initialState } from '../state/firearms/firearms.reducer';
import { FirearmForm } from './firearm-form';

describe('FirearmForm', () => {
  let fixture: ComponentFixture<FirearmForm>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const element = () => fixture.nativeElement as HTMLElement;
  const input = (id: string) => element().querySelector(`#${id}`) as HTMLInputElement;
  const chooseOptics = async (value: string) => {
    const select = element().querySelector('#firearm-optics') as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const submitButton = () => element().querySelector('button[type="submit"]') as HTMLButtonElement;
  const enter = async (id: string, value: string) => {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FirearmForm],
      providers: [provideTranslateService({ lang: 'en' }), provideMockStore({ initialState: { firearms: initialState } })],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      FIREARMS: { OPTICS: { none: 'No optic sight', riflescope: 'Riflescope' }, FORM: { SAVE_FAILED: 'Failed' } },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(FirearmForm);
    await fixture.whenStable();
  });

  it('should offer the optics with no optic sight selected by default', () => {
    const select = element().querySelector('#firearm-optics') as HTMLSelectElement;

    expect(Array.from(select.options).map((option) => option.value)).toEqual([...OPTICS]);
    expect(select.value).toBe('none');
    expect(select.selectedOptions[0].textContent?.trim()).toBe('No optic sight');
  });

  it('should need a name and a caliber', async () => {
    expect(submitButton().disabled).toBe(true);

    await enter('firearm-name', 'Blaser R8');
    expect(submitButton().disabled).toBe(true);

    await enter('firearm-caliber', '   ');
    expect(submitButton().disabled).toBe(true);

    await enter('firearm-caliber', '.308 Win');
    expect(submitButton().disabled).toBe(false);
  });

  it('should offer the common calibers while allowing any other to be typed in', async () => {
    const caliber = input('firearm-caliber');
    const options = Array.from(element().querySelectorAll('#firearm-calibers option')).map((option) => option.getAttribute('value'));

    expect(caliber.getAttribute('list')).toBe('firearm-calibers');
    expect(options).toEqual([...COMMON_CALIBERS]);
    expect(options).toContain('.308 Win');

    await enter('firearm-name', 'Old rifle');
    await enter('firearm-caliber', '7×72 R');
    expect(submitButton().disabled).toBe(false);
  });

  it('should ask for the make and model of the optics only once a sight is chosen', async () => {
    expect(element().querySelector('#firearm-optics-model')).toBeNull();

    await chooseOptics('thermal');
    expect(element().querySelector('#firearm-optics-model')).not.toBeNull();

    await chooseOptics('none');
    expect(element().querySelector('#firearm-optics-model')).toBeNull();
  });

  it('should add the firearm with its trimmed fields and the chosen optics with their make and model', async () => {
    await enter('firearm-name', '  Blaser R8 ');
    await enter('firearm-caliber', ' .308 Win ');
    await chooseOptics('riflescope');
    await enter('firearm-optics-model', ' Zeiss Victory V8 ');

    submitButton().click();

    expect(dispatch).toHaveBeenCalledWith(
      FirearmsActions.addFirearm({
        firearm: { name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope', opticsModel: 'Zeiss Victory V8', suppressed: false, barrelLength: null },
      }),
    );
  });

  it('should leave out a make and model typed before switching back to no optics, and an empty one', async () => {
    await enter('firearm-name', 'CZ 527');
    await enter('firearm-caliber', '.222 Rem');
    await chooseOptics('red-dot');
    await enter('firearm-optics-model', 'Aimpoint');
    await chooseOptics('none');

    submitButton().click();
    expect(dispatch).toHaveBeenLastCalledWith(
      FirearmsActions.addFirearm({ firearm: { name: 'CZ 527', caliber: '.222 Rem', optics: 'none', opticsModel: null, suppressed: false, barrelLength: null } }),
    );

    await chooseOptics('red-dot');
    await enter('firearm-optics-model', '   ');
    submitButton().click();
    expect(dispatch).toHaveBeenLastCalledWith(
      FirearmsActions.addFirearm({ firearm: { name: 'CZ 527', caliber: '.222 Rem', optics: 'red-dot', opticsModel: null, suppressed: false, barrelLength: null } }),
    );
  });

  it('should show an error when saving failed', async () => {
    store.setState({ firearms: { ...initialState, saveError: 'boom' } });
    await fixture.whenStable();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain('Failed');
  });

  it('should mark a firearm as suppressed, which it is not by default', async () => {
    const checkbox = input('firearm-suppressed');
    expect(checkbox.type).toBe('checkbox');
    expect(checkbox.checked).toBe(false);

    await enter('firearm-name', 'Sauer 404');
    await enter('firearm-caliber', '.308 Win');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    submitButton().click();

    expect(dispatch).toHaveBeenCalledWith(
      FirearmsActions.addFirearm({
        firearm: { name: 'Sauer 404', caliber: '.308 Win', optics: 'none', opticsModel: null, suppressed: true, barrelLength: null },
      }),
    );
  });

  describe('editing a firearm', () => {
    const existing: Firearm = {
      id: 'a',
      name: 'Blaser R8',
      caliber: '.308 Win',
      optics: 'riflescope',
      opticsModel: 'Zeiss Victory V8',
      suppressed: true,
      barrelLength: null,
    };

    beforeEach(async () => {
      fixture.componentRef.setInput('firearm', existing);
      await fixture.whenStable();
    });

    it('should prefill the form with the firearm', () => {
      expect(input('firearm-name').value).toBe('Blaser R8');
      expect(input('firearm-caliber').value).toBe('.308 Win');
      expect((element().querySelector('#firearm-optics') as HTMLSelectElement).value).toBe('riflescope');
      expect(input('firearm-optics-model').value).toBe('Zeiss Victory V8');
      expect(input('firearm-suppressed').checked).toBe(true);
      expect(submitButton().disabled).toBe(false);
    });

    it('should update the firearm, keeping its id', async () => {
      await enter('firearm-caliber', '6.5 Creedmoor');

      submitButton().click();

      expect(dispatch).toHaveBeenCalledWith(FirearmsActions.updateFirearm({ firearm: { ...existing, caliber: '6.5 Creedmoor' } }));
    });

    it('should show the stored barrel length in mm and keep it', async () => {
      fixture.componentRef.setInput('firearm', { ...existing, barrelLength: 558.8 });
      await fixture.whenStable();

      expect(input('firearm-barrel-length').value).toBe('558.8');
      expect((element().querySelector('#firearm-barrel-length-unit') as HTMLSelectElement).value).toBe('mm');

      submitButton().click();
      expect(dispatch).toHaveBeenCalledWith(FirearmsActions.updateFirearm({ firearm: { ...existing, barrelLength: 558.8 } }));
    });

    it('should prefill an older firearm stored without a make and model or the suppressor', async () => {
      fixture.componentRef.setInput('firearm', { id: 'b', name: 'CZ 527', caliber: '.222 Rem', optics: 'none' });
      await fixture.whenStable();

      expect(input('firearm-suppressed').checked).toBe(false);
      expect(element().querySelector('#firearm-optics-model')).toBeNull();
    });
  });

  describe('barrel length', () => {
    const chooseUnit = async (value: string) => {
      const select = element().querySelector('#firearm-barrel-length-unit') as HTMLSelectElement;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    const save = async () => {
      await enter('firearm-name', 'Blaser R8');
      await enter('firearm-caliber', '.308 Win');
      submitButton().click();
      return (dispatch.mock.calls.at(-1)![0] as ReturnType<typeof FirearmsActions.addFirearm>).firearm.barrelLength;
    };

    it('should be optional and entered in mm by default', async () => {
      expect((element().querySelector('#firearm-barrel-length-unit') as HTMLSelectElement).value).toBe('mm');
      expect(await save()).toBeNull();

      await enter('firearm-barrel-length', '560');
      expect(await save()).toBe(560);
    });

    it('should store a length entered in inches in mm, reading a decimal comma', async () => {
      await chooseUnit('in');
      await enter('firearm-barrel-length', '22');
      expect(await save()).toBe(558.8);

      await enter('firearm-barrel-length', '20,5');
      expect(await save()).toBe(520.7);
    });

    it('should point out a length out of range in the chosen unit', async () => {
      await enter('firearm-name', 'Blaser R8');
      await enter('firearm-caliber', '.308 Win');

      await enter('firearm-barrel-length', '22');
      expect(input('firearm-barrel-length').classList).toContain('is-invalid');
      expect(submitButton().disabled).toBe(true);

      // 22 is too short in mm but fine in inches
      await chooseUnit('in');
      expect(input('firearm-barrel-length').classList).not.toContain('is-invalid');
      expect(submitButton().disabled).toBe(false);
    });
  });
});
