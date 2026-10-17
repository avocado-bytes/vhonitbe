import { Component, computed, DOCUMENT, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { HuntingEvent } from '../model/event';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { EventsActions } from '../state/events/events.actions';
import {
  selectDeleteError,
  selectDeleting,
  selectEvents,
  selectLoadError,
  selectLoading,
  selectPageCount,
  selectPageIndex,
  selectTotal,
} from '../state/events/events.reducer';
import { moonIllumination, MoonIllumination, moonPhaseName, sunTimes } from '../shared/astronomy';
import { LocationActions } from '../state/location/location.actions';
import { selectPosition, selectStatus } from '../state/location/location.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';
import { WeatherActions } from '../state/weather/weather.actions';
import { compassDirection, weatherCondition } from '../state/weather/weather.model';
import { selectCurrentWeather, selectWeatherStatus } from '../state/weather/weather.reducer';
import { DASHBOARD_ICONS, DashboardIcon } from './dashboard-icons';

/** Radius of the drawn moon in its 16 × 16 view box */
const MOON_RADIUS = 7;

/**
 * The lit part of the moon as an SVG path: the outer half on the lit side, closed by the terminator,
 * an ellipse bulging into the dark half for a crescent and into the lit half for a gibbous moon.
 * Lit from the right while waxing, as seen from the northern hemisphere.
 */
function moonLitPath({ fraction, phase }: MoonIllumination): string {
  const r = MOON_RADIUS;
  const waxing = phase < 0.5;
  const terminator = r * Math.abs(1 - 2 * fraction);
  const gibbous = fraction > 0.5;
  const outer = waxing ? 1 : 0;
  const inner = waxing === gibbous ? 1 : 0;
  return `M8 ${8 - r}A${r} ${r} 0 0 ${outer} 8 ${8 + r}A${terminator.toFixed(3)} ${r} 0 0 ${inner} 8 ${8 - r}Z`;
}

@Component({
  imports: [TranslatePipe, DecimalPipe],
  selector: 'app-overview',
  styleUrl: './overview.scss',
  templateUrl: './overview.html',
})
export class Overview {
  private readonly store = inject(Store);
  private readonly translate = inject(TranslateService);
  private readonly window = inject(DOCUMENT).defaultView;

  protected readonly events = this.store.selectSignal(selectEvents);
  protected readonly total = this.store.selectSignal(selectTotal);
  protected readonly pageIndex = this.store.selectSignal(selectPageIndex);
  protected readonly pageCount = this.store.selectSignal(selectPageCount);
  protected readonly loading = this.store.selectSignal(selectLoading);
  protected readonly loadError = this.store.selectSignal(selectLoadError);
  protected readonly deleteError = this.store.selectSignal(selectDeleteError);
  private readonly deleting = this.store.selectSignal(selectDeleting);

  private readonly language = this.store.selectSignal(selectLanguage);
  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium', timeStyle: 'short' }),
  );
  private readonly timeFormat = computed(() => new Intl.DateTimeFormat(this.language(), { timeStyle: 'short' }));

  protected readonly icons = DASHBOARD_ICONS;
  protected readonly position = this.store.selectSignal(selectPosition);
  protected readonly locationStatus = this.store.selectSignal(selectStatus);

  /** Local noon picks today's sunrise and sunset in any time zone */
  private readonly today = new Date(new Date().setHours(12, 0, 0, 0));
  protected readonly sun = computed(() => {
    const position = this.position();
    return position ? sunTimes(this.today, position.latitude, position.longitude) : null;
  });

  protected readonly moon = moonIllumination(new Date());
  protected readonly moonPhase = moonPhaseName(this.moon.phase);
  protected readonly moonPath = moonLitPath(this.moon);

  protected readonly weather = this.store.selectSignal(selectCurrentWeather);
  protected readonly weatherStatus = this.store.selectSignal(selectWeatherStatus);
  protected readonly weatherCondition = computed(() => {
    const weather = this.weather();
    return weather ? weatherCondition(weather.weatherCode) : null;
  });
  protected readonly weatherIcon = computed((): DashboardIcon | null => {
    const condition = this.weatherCondition();
    const night = this.weather()?.isDay === false;
    switch (condition) {
      case null:
        return null;
      case 'clear':
        return night ? 'clear-night' : 'clear';
      case 'partly-cloudy':
        return night ? 'partly-cloudy-night' : 'partly-cloudy';
      default:
        return condition;
    }
  });

  /** The arrow points where the wind blows, opposite to where it comes from */
  protected readonly windArrowRotation = computed(() => ((this.weather()?.windDirection ?? 0) + 180) % 360);
  protected readonly windFrom = computed(() => {
    const weather = this.weather();
    return weather ? compassDirection(weather.windDirection) : null;
  });

  constructor() {
    // Sunrise, sunset and the weather depend on where the user is
    this.store.dispatch(LocationActions.locate());
    this.store.dispatch(WeatherActions.load());
  }

  protected formatTime(date: Date | null): string {
    return date ? this.timeFormat().format(date) : '–';
  }

  protected formatDate(iso: string): string {
    return this.dateFormat().format(new Date(iso));
  }

  protected goToPage(pageIndex: number): void {
    this.store.dispatch(EventsActions.loadPage({ pageIndex }));
  }

  protected edit(event: HuntingEvent): void {
    this.store.dispatch(EventsActions.startEdit({ event }));
  }

  protected isDeleting(id: string): boolean {
    return this.deleting().includes(id);
  }

  protected delete(id: string): void {
    if (this.window?.confirm(this.translate.instant('OVERVIEW.DELETE_CONFIRM'))) {
      this.store.dispatch(EventsActions.deleteEvent({ id }));
    }
  }
}
