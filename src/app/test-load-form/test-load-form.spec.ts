import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { LoadSeries, TestLoad } from '../model/load-series';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import { initialState } from '../state/handloading/handloading.reducer';
import { TestLoadForm } from './test-load-form';

describe('TestLoadForm', () => {
  let fixture: ComponentFixture<TestLoadForm>;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const existing: TestLoad = {
    id: 'l1',
    powderCharge: 44,
    overallLength: 71.1,
    shots: 3,
    groupSize: 22,
    velocities: [805, 810],
    notes: 'Easy bolt lift',
    promotedAt: null,
  };
  const series: LoadSeries = { id: 's1', caliber: '.308 Win', loads: [existing] };
  const element = () => fixture.nativeElement as HTMLElement;
  const input = (id: string) => element().querySelector(`#${id}`) as HTMLInputElement;
  const submitButton = () => element().querySelector('button[type="submit"]') as HTMLButtonElement;
  const enter = async (id: string, value: string) => {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const savedLoads = () => {
    submitButton().click();
    return (dispatch.mock.calls.at(-1)![0] as ReturnType<typeof HandloadingActions.updateSeries>).series.loads!;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestLoadForm],
      providers: [
        provideTranslateService({ lang: 'en' }),
        provideMockStore({ initialState: { handloading: initialState, settings: { theme: 'light', language: 'en' } } }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      HANDLOADING: {
        AVERAGE: 'average {{value}} m/s',
        EXTREME_SPREAD: 'ES {{value}} m/s',
        STANDARD_DEVIATION: 'SD {{value}} m/s',
        LOAD_FORM: { VELOCITIES_INVALID: 'Invalid' },
      },
    });
    dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
    fixture = TestBed.createComponent(TestLoadForm);
    fixture.componentRef.setInput('series', series);
    await fixture.whenStable();
  });

  it('should add a test load to the series, keeping the loads it has', async () => {
    await enter('test-load-charge', '44,5');
    await enter('test-load-length', '71.1');
    await enter('test-load-shots', '3');
    await enter('test-load-group', '18');
    await enter('test-load-velocities', '812, 818 815');
    await enter('test-load-notes', ' Slightly flattened primers ');

    const loads = savedLoads();

    expect(loads).toEqual([
      existing,
      {
        id: expect.any(String),
        powderCharge: 44.5,
        overallLength: 71.1,
        shots: 3,
        groupSize: 18,
        velocities: [812, 818, 815],
        notes: 'Slightly flattened primers',
        promotedAt: null,
      },
    ]);
  });

  it('should show the velocity statistics as the velocities are typed', async () => {
    expect(element().querySelector('#test-load-velocities-stats')).toBeNull();

    await enter('test-load-velocities', '812, 818, 815');

    expect(element().querySelector('#test-load-velocities-stats')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'average 815 m/s · ES 6 m/s · SD 3 m/s',
    );
  });

  it('should refuse velocities it cannot read and numbers out of range', async () => {
    await enter('test-load-velocities', '820,5');
    expect(input('test-load-velocities').classList).toContain('is-invalid');
    expect(submitButton().disabled).toBe(true);

    await enter('test-load-velocities', '820.5');
    await enter('test-load-shots', '2.5');
    expect(submitButton().disabled).toBe(true);

    await enter('test-load-shots', '5');
    await enter('test-load-charge', '500');
    expect(submitButton().disabled).toBe(true);
  });

  it('should save a test load with nothing measured yet', () => {
    expect(savedLoads()[1]).toEqual({
      id: expect.any(String),
      powderCharge: null,
      overallLength: null,
      shots: null,
      groupSize: null,
      velocities: [],
      notes: '',
      promotedAt: null,
    });
  });

  it('should prefill and update an edited test load in place', async () => {
    fixture.componentRef.setInput('load', existing);
    await fixture.whenStable();
    expect(input('test-load-velocities').value).toBe('805, 810');
    expect(input('test-load-charge').value).toBe('44');

    await enter('test-load-velocities', '805, 810, 808');

    expect(savedLoads()).toEqual([{ ...existing, velocities: [805, 810, 808] }]);
  });
});
