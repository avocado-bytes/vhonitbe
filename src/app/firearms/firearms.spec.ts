import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Ammunition } from '../model/ammunition';
import { AmmunitionActions } from '../state/ammunition/ammunition.actions';
import { AmmunitionState, initialState as ammunitionInitialState } from '../state/ammunition/ammunition.reducer';
import { FirearmsActions } from '../state/firearms/firearms.actions';
import { FirearmsState, initialState } from '../state/firearms/firearms.reducer';
import { Firearms } from './firearms';

describe('Firearms', () => {
  let fixture: ComponentFixture<Firearms>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const element = () => fixture.nativeElement as HTMLElement;
  const dialog = () => element().querySelector('dialog.form-dialog') as HTMLDialogElement;
  const setState = async (firearms: Partial<FirearmsState>, ammunition: Partial<AmmunitionState> = {}) => {
    store.setState({
      firearms: { ...initialState, ...firearms },
      ammunition: { ...ammunitionInitialState, ...ammunition },
      settings: { theme: 'light', language: 'en' },
    });
    await fixture.whenStable();
  };

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Firearms],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({
          initialState: {
            firearms: initialState,
            ammunition: ammunitionInitialState,
            settings: { theme: 'light', language: 'en' },
          },
        }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      FIREARMS: {
        ADD: 'Add firearm',
        ADD_ANY: 'Add firearm or ammunition',
        DELETE: 'Delete firearm',
        DELETE_CONFIRM: 'Delete this firearm?',
        EDIT: 'Edit firearm',
        ACTIONS: 'Firearm actions',
        SUPPRESSED: 'Suppressed',
        BARREL_LENGTH: 'barrel {{value}} mm',
        EMPTY: 'No firearms yet',
        OPTICS: { none: 'No optic sight', riflescope: 'Riflescope' },
        FORM: { ADD_TITLE: 'Add firearm', EDIT_TITLE: 'Edit firearm', ADD_ANY_TITLE: 'Add', KIND_PLACEHOLDER: 'Select' },
      },
      AMMUNITION: {
        EMPTY: 'No ammunition yet',
        SOURCES: { factory: 'Factory', handload: 'Handload' },
        BC: 'BC G1 {{value}}',
        EDIT: 'Edit ammunition',
        DELETE: 'Delete ammunition',
        DELETE_CONFIRM: 'Delete this ammunition?',
        PRIMER: 'Primer {{value}}',
        POWDER: 'Powder {{value}}',
        BRASS: 'Brass {{value}}',
        BRASS_FIRINGS: 'brass fired {{count}}×',
        POWDER_CHARGE: 'charge {{value}} gr',
        OVERALL_LENGTH: 'OAL {{value}} mm',
        FORM: { ADD_TITLE: 'Add ammunition', EDIT_TITLE: 'Edit ammunition' },
      },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(Firearms);
    await fixture.whenStable();
  });

  it('should load the firearms and explain an empty list', () => {
    expect(dispatch).toHaveBeenCalledWith(FirearmsActions.load());
    expect(element().textContent).toContain('No firearms yet');
  });

  it('should list each firearm with its caliber and optics with their make and model', async () => {
    await setState({
      firearms: [
        { id: 'a', name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope', opticsModel: 'Zeiss Victory V8' },
        { id: 'b', name: 'CZ 527', caliber: '.222 Rem', optics: 'none', suppressed: true, barrelLength: 520.7 },
      ],
    });

    const items = Array.from(element().querySelectorAll('li.firearm'));
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Blaser R8');
    expect(items[0].textContent?.replace(/\s+/g, ' ')).toContain('.308 Win · Riflescope Zeiss Victory V8');
    expect(items[1].textContent?.replace(/\s+/g, ' ')).toContain('.222 Rem · No optic sight · Suppressed · barrel 520.7 mm');
    expect(items[0].textContent).not.toContain('Suppressed');
  });

  it('should start adding with the add button and open the dialog with the kind to choose first', async () => {
    const fab = element().querySelector('button.fab') as HTMLButtonElement;
    expect(fab.getAttribute('aria-label')).toBe('Add firearm or ammunition');

    fab.click();
    expect(dispatch).toHaveBeenCalledWith(FirearmsActions.startAdd());

    await setState({ formOpen: true });
    await fixture.whenStable();
    expect(dialog().open).toBe(true);
    expect((dialog().querySelector('#add-kind') as HTMLSelectElement).value).toBe('');
    expect(dialog().querySelector('#firearm-form-title')?.textContent).toContain('Add');
    expect(dialog().querySelector('app-firearm-form')).toBeNull();
    expect(dialog().querySelector('app-ammunition-form')).toBeNull();
  });

  it('should show the form for the chosen kind', async () => {
    await setState({ formOpen: true });
    await fixture.whenStable();
    const kind = dialog().querySelector('#add-kind') as HTMLSelectElement;
    const choose = async (value: string) => {
      kind.value = value;
      kind.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };

    expect(Array.from(kind.options).map((option) => option.value)).toEqual(['', 'firearm', 'ammunition']);

    await choose('firearm');
    expect(dialog().querySelector('app-firearm-form')).not.toBeNull();
    expect(dialog().querySelector('#firearm-form-title')?.textContent).toContain('Add firearm');

    await choose('ammunition');
    expect(dialog().querySelector('app-firearm-form')).toBeNull();
    expect(dialog().querySelector('app-ammunition-form')).not.toBeNull();
    expect(dialog().querySelector('#firearm-form-title')?.textContent).toContain('Add ammunition');
  });

  it('should ask for the kind again each time the add button is used', async () => {
    await setState({ formOpen: true });
    await fixture.whenStable();
    const kind = dialog().querySelector('#add-kind') as HTMLSelectElement;
    kind.value = 'ammunition';
    kind.dispatchEvent(new Event('change'));
    await setState({ formOpen: false });

    (element().querySelector('button.fab') as HTMLButtonElement).click();
    await setState({ formOpen: true });
    await fixture.whenStable();

    expect((dialog().querySelector('#add-kind') as HTMLSelectElement).value).toBe('');
  });

  it('should cancel the form when the dialog is closed', async () => {
    await setState({ formOpen: true });
    await fixture.whenStable();

    (dialog().querySelector('.btn-close') as HTMLButtonElement).click();

    expect(dispatch).toHaveBeenCalledWith(FirearmsActions.closeForm());
  });

  describe('editing', () => {
    const firearm = { id: 'a', name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope' as const };

    beforeEach(() => setState({ firearms: [firearm] }));

    it('should start editing from the edit button on wider screens', () => {
      (element().querySelector('li.firearm button[aria-label="Edit firearm"]') as HTMLButtonElement).click();

      expect(dispatch).toHaveBeenCalledWith(FirearmsActions.startEdit({ firearm }));
    });

    it('should start editing from the action menu on phones, closing the menu', async () => {
      const toggle = element().querySelector('li.firearm button[aria-haspopup="menu"]') as HTMLButtonElement;
      toggle.click();
      await fixture.whenStable();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');

      (element().querySelector('#firearm-actions-a [role="menuitem"]') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(dispatch).toHaveBeenCalledWith(FirearmsActions.startEdit({ firearm }));
      expect(element().querySelector('#firearm-actions-a')).toBeNull();
    });

    it('should open the form titled for editing with the firearm', async () => {
      await setState({ firearms: [firearm], formOpen: true, editing: firearm });
      await fixture.whenStable();

      expect(dialog().open).toBe(true);
      expect(dialog().querySelector('#firearm-form-title')?.textContent).toContain('Edit firearm');
      expect((dialog().querySelector('#firearm-name') as HTMLInputElement).value).toBe('Blaser R8');
    });
  });

  it('should not offer the kind when editing a firearm', async () => {
    const firearm = { id: 'a', name: 'Blaser R8', caliber: '.308 Win', optics: 'none' as const };
    await setState({ firearms: [firearm], formOpen: true, editing: firearm });
    await fixture.whenStable();

    expect(dialog().querySelector('#add-kind')).toBeNull();
    expect(dialog().querySelector('app-firearm-form')).not.toBeNull();
  });

  describe('deleting', () => {
    const firearm = { id: 'a', name: 'Blaser R8', caliber: '.308 Win', optics: 'none' as const };

    beforeEach(() => setState({ firearms: [firearm] }));
    afterEach(() => vi.restoreAllMocks());

    it('should delete a firearm from its delete button only once confirmed', () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
      const button = element().querySelector('li.firearm button[aria-label="Delete firearm"]') as HTMLButtonElement;

      button.click();
      expect(dispatch).not.toHaveBeenCalledWith(FirearmsActions.deleteFirearm({ id: 'a' }));

      button.click();
      expect(confirm).toHaveBeenCalledWith('Delete this firearm?');
      expect(dispatch).toHaveBeenCalledWith(FirearmsActions.deleteFirearm({ id: 'a' }));
    });

    it('should delete a firearm from the action menu on phones', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      (element().querySelector('li.firearm button[aria-haspopup="menu"]') as HTMLButtonElement).click();
      await fixture.whenStable();

      const items = element().querySelectorAll('#firearm-actions-a [role="menuitem"]');
      expect(Array.from(items).map((item) => item.textContent?.trim())).toEqual(['Edit firearm', 'Delete firearm']);
      (items[1] as HTMLButtonElement).click();

      expect(dispatch).toHaveBeenCalledWith(FirearmsActions.deleteFirearm({ id: 'a' }));
    });

    it('should disable the actions while deleting', async () => {
      await setState({ firearms: [firearm], deleting: ['a'] });

      expect((element().querySelector('li.firearm button[aria-label="Delete firearm"]') as HTMLButtonElement).disabled).toBe(true);
      expect((element().querySelector('li.firearm button[aria-label="Edit firearm"]') as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('ammunition', () => {
    const cartridge: Ammunition = {
      id: 'x',
      caliber: '.308 Win',
      source: 'handload',
      bulletWeight: 165,
      muzzleVelocity: 820,
      bulletType: 'Soft point (SP)',
      ballisticCoefficient: 0.447,
      primer: '',
      powder: '',
      brass: '',
      brassFirings: null,
    };

    it('should load the ammunition and explain an empty list', () => {
      expect(dispatch).toHaveBeenCalledWith(AmmunitionActions.load());
      expect(element().textContent).toContain('No ammunition yet');
    });

    it('should list each with its caliber, bullet type, source, weight, velocity and ballistic coefficient', async () => {
      await setState({}, { ammunition: [cartridge, { ...cartridge, id: 'y', source: 'factory', bulletType: '', ballisticCoefficient: null }] });

      const items = Array.from(element().querySelectorAll('li.ammunition')).map((item) => item.textContent?.replace(/\s+/g, ' ').trim());
      expect(items[0]).toBe('.308 Win · Soft point (SP) Handload · 165 gr · 820 m/s · BC G1 0.447');
      expect(items[1]).toBe('.308 Win Factory · 165 gr · 820 m/s');
    });

    it('should list the components of a handload that were given', async () => {
      await setState({}, {
        ammunition: [{ ...cartridge, primer: 'CCI 200', powder: '', powderCharge: 41.5, brass: 'Lapua', brassFirings: 0, overallLength: 71.1 }],
      });

      const components = element().querySelector('li.ammunition .ammunition-components');
      expect(Array.from(components!.querySelectorAll('span')).map((span) => span.textContent?.trim())).toEqual([
        'Primer CCI 200',
        'charge 41.5 gr',
        'Brass Lapua',
        'brass fired 0×',
        'OAL 71.1 mm',
      ]);
    });

    it('should show the make and product of factory ammunition in its title', async () => {
      await setState({}, { ammunition: [{ ...cartridge, source: 'factory', product: 'RWS EVO' }] });

      expect(element().querySelector('li.ammunition .fw-semibold')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        '.308 Win · RWS EVO · Soft point (SP)',
      );
    });

    it('should edit ammunition from its edit button and show its form in the dialog', async () => {
      await setState({}, { ammunition: [cartridge] });
      (element().querySelector('li.ammunition button[aria-label="Edit ammunition"]') as HTMLButtonElement).click();
      expect(dispatch).toHaveBeenCalledWith(AmmunitionActions.startEdit({ ammunition: cartridge }));

      await setState({ formOpen: true }, { ammunition: [cartridge], editing: cartridge });
      await fixture.whenStable();
      expect(dialog().querySelector('#firearm-form-title')?.textContent).toContain('Edit ammunition');
      expect(dialog().querySelector('#add-kind')).toBeNull();
      expect((dialog().querySelector('#ammunition-caliber') as HTMLInputElement).value).toBe('.308 Win');
    });

    it('should edit and delete ammunition from the action menu on phones, deleting only once confirmed', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
      await setState({}, { ammunition: [cartridge] });
      const openMenu = async () => {
        (element().querySelector('li.ammunition button[aria-haspopup="menu"]') as HTMLButtonElement).click();
        await fixture.whenStable();
        return Array.from(element().querySelectorAll<HTMLButtonElement>('#ammunition-actions-x [role="menuitem"]'));
      };

      const items = await openMenu();
      expect(items.map((item) => item.textContent?.trim())).toEqual(['Edit ammunition', 'Delete ammunition']);
      // Each item closes the menu, so it is opened again for the next one
      items[1].click();
      await fixture.whenStable();
      expect(dispatch).not.toHaveBeenCalledWith(AmmunitionActions.deleteAmmunition({ id: 'x' }));

      (await openMenu())[1].click();
      expect(confirm).toHaveBeenCalledWith('Delete this ammunition?');
      expect(dispatch).toHaveBeenCalledWith(AmmunitionActions.deleteAmmunition({ id: 'x' }));
      confirm.mockRestore();
    });
  });
});
