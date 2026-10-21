import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Firearm } from '../model/firearm';
import { COMMON_CALIBERS } from '../model/firearm';
import { LoadSeries } from '../model/load-series';
import { toDateTimeLocal } from '../shared/datetime-local';
import { FirearmsActions } from '../state/firearms/firearms.actions';
import { initialState as firearmsInitialState } from '../state/firearms/firearms.reducer';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import { initialState } from '../state/handloading/handloading.reducer';
import { LoadSeriesForm } from './load-series-form';

describe('LoadSeriesForm', () => {
  let fixture: ComponentFixture<LoadSeriesForm>;
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const firearm: Firearm = { id: 'g1', name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope', opticsModel: 'Zeiss V8' };
  const element = () => fixture.nativeElement as HTMLElement;
  const input = (id: string) => element().querySelector(`#${id}`) as HTMLInputElement;
  const submitButton = () => element().querySelector('button[type="submit"]') as HTMLButtonElement;
  const enter = async (id: string, value: string) => {
    input(id).value = value;
    input(id).dispatchEvent(new Event(input(id).tagName === 'SELECT' ? 'change' : 'input'));
    await fixture.whenStable();
  };
  const submitted = () => {
    submitButton().click();
    return dispatch.mock.calls.at(-1)![0] as ReturnType<typeof HandloadingActions.addSeries>;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadSeriesForm],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({
          initialState: { handloading: initialState, firearms: { ...firearmsInitialState, firearms: [firearm] } },
        }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      HANDLOADING: { FORM: { SAVE_FAILED: 'Failed' } },
      AMMUNITION: { BULLET_TYPES: ['Soft point (SP)'], FORM: { RANGE_INVALID: 'From {{min}} to {{max}}' } },
      ADD_ITEM: { NOT_GIVEN: 'Not given', AS_RECORDED: '{{label}} (as recorded)' },
    });
    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(LoadSeriesForm);
    await fixture.whenStable();
  });

  it('should load the saved firearms to choose from', () => {
    expect(dispatch).toHaveBeenCalledWith(FirearmsActions.load());
    expect(Array.from((input('load-series-firearm') as unknown as HTMLSelectElement).options).map((o) => o.textContent?.trim())).toEqual([
      'Not given',
      'Blaser R8 (.308 Win)',
    ]);
  });

  it('should offer the common calibers and need one, starting today', async () => {
    expect(Array.from(element().querySelectorAll('#load-series-calibers option')).map((o) => o.getAttribute('value'))).toEqual([
      ...COMMON_CALIBERS,
    ]);
    expect(input('load-series-started').value).toBe(toDateTimeLocal(new Date()).slice(0, 10));
    expect(submitButton().disabled).toBe(true);

    await enter('load-series-caliber', '.308 Win');
    expect(submitButton().disabled).toBe(false);
  });

  it('should start a series with its details, components, case length and a copy of the firearm', async () => {
    await enter('load-series-caliber', ' .308 Win ');
    await enter('load-series-name', 'Varget 168 SMK');
    await enter('load-series-started', '2026-10-01');
    await enter('load-series-bullet-type', 'Sierra MatchKing');
    await enter('load-series-bullet-weight', '168');
    await enter('load-series-powder', 'Hodgdon Varget');
    await enter('load-series-primer', 'CCI BR-2');
    await enter('load-series-brass', 'Lapua');
    await enter('load-series-case-length', '51,0');
    await enter('load-series-firearm', 'g1');

    expect(submitted()).toEqual(
      HandloadingActions.addSeries({
        series: {
          caliber: '.308 Win',
          name: 'Varget 168 SMK',
          startedAt: '2026-10-01',
          bulletType: 'Sierra MatchKing',
          bulletWeight: 168,
          powder: 'Hodgdon Varget',
          primer: 'CCI BR-2',
          brass: 'Lapua',
          caseLength: 51,
          firearm: { name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope', opticsModel: 'Zeiss V8' },
          loads: [],
        },
      }),
    );
  });

  it('should point out a bullet weight or case length out of range', async () => {
    await enter('load-series-caliber', '.308 Win');

    await enter('load-series-case-length', '500');
    expect(input('load-series-case-length').classList).toContain('is-invalid');
    expect(submitButton().disabled).toBe(true);

    await enter('load-series-case-length', '51');
    await enter('load-series-bullet-weight', '0');
    expect(submitButton().disabled).toBe(true);
  });

  describe('editing a series', () => {
    const recorded = { name: 'Old rifle', caliber: '.308 Win', optics: 'none' as const };
    const existing: LoadSeries = {
      id: 's1',
      caliber: '.308 Win',
      name: 'Varget',
      startedAt: '2026-09-01',
      caseLength: 51.2,
      firearm: recorded,
      loads: [{ id: 'l1', powderCharge: 44, overallLength: null, shots: null, groupSize: null, velocities: [], notes: '' }],
    };

    beforeEach(async () => {
      fixture.componentRef.setInput('series', existing);
      await fixture.whenStable();
    });

    it('should prefill the series, offering the firearm as recorded', () => {
      expect(input('load-series-name').value).toBe('Varget');
      expect(input('load-series-started').value).toBe('2026-09-01');
      expect(input('load-series-case-length').value).toBe('51.2');
      expect((input('load-series-firearm') as unknown as HTMLSelectElement).value).toBe('recorded');
    });

    it('should update the details, keeping the test loads and the recorded firearm', async () => {
      await enter('load-series-powder', 'Hodgdon Varget');

      const { series } = submitted() as unknown as ReturnType<typeof HandloadingActions.updateSeries>;

      expect(series.id).toBe('s1');
      expect(series.powder).toBe('Hodgdon Varget');
      expect(series.loads).toEqual(existing.loads);
      expect(series.firearm).toEqual(recorded);
    });
  });

  it('should show an error when saving failed', async () => {
    store.setState({ handloading: { ...initialState, saveError: 'boom' }, firearms: firearmsInitialState });
    await fixture.whenStable();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain('Failed');
  });
});
