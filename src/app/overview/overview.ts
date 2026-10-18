import { afterNextRender, Component, computed, DestroyRef, DOCUMENT, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { EventMap } from '../event-map/event-map';
import { EventPhoto } from '../event-photo/event-photo';
import { EventSort, HuntingEvent } from '../model/event';
import { Animal, ANIMAL_GROUPS, Item, ITEMS } from '../model/item';
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
  selectQuery,
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

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Hunting some game is not allowed from this long after sunset until this long before sunrise */
const NIGHT_MARGIN = HOUR_MS;

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
  imports: [TranslatePipe, DecimalPipe, KeyValuePipe, EventMap, EventPhoto],
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

  protected readonly query = this.store.selectSignal(selectQuery);
  protected readonly filtered = computed(() => this.query().type !== null || this.query().animal !== null);
  protected readonly items = ITEMS;
  protected readonly animalGroups = ANIMAL_GROUPS;
  /** Keeps the groups in their declared order instead of KeyValuePipe's alphabetical order */
  protected readonly keepOrder = () => 0;

  private readonly language = this.store.selectSignal(selectLanguage);
  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium', timeStyle: 'short' }),
  );
  private readonly timeFormat = computed(() => new Intl.DateTimeFormat(this.language(), { timeStyle: 'short' }));

  protected readonly icons = DASHBOARD_ICONS;
  protected readonly position = this.store.selectSignal(selectPosition);
  protected readonly locationStatus = this.store.selectSignal(selectStatus);


  /** The current time, updated every minute so the night card appears and disappears on its own */
  private readonly now = signal(Date.now());

  /** Local noon picks today's sunrise and sunset in any time zone; follows the date past midnight */
  private readonly today = computed(() => new Date(new Date(this.now()).setHours(12, 0, 0, 0)));
  protected readonly sun = computed(() => {
    const position = this.position();
    return position ? sunTimes(this.today(), position.latitude, position.longitude) : null;
  });

  /** When the current night ends, if it is night: one hour after sunset until one hour before sunrise */
  protected readonly nightEnds = computed((): Date | null => {
    const position = this.position();
    if (!position) {
      return null;
    }
    const now = this.now();
    const times = (dayOffset: number) =>
      sunTimes(new Date(this.today().getTime() + dayOffset * DAY_MS), position.latitude, position.longitude);
    const today = this.sun() ?? times(0);
    if (!today.sunrise || !today.sunset) {
      // No sunrise or sunset today (polar day or night)
      return null;
    }
    if (now < today.sunrise.getTime() - NIGHT_MARGIN) {
      return new Date(today.sunrise.getTime() - NIGHT_MARGIN);
    }
    if (now > today.sunset.getTime() + NIGHT_MARGIN) {
      const tomorrow = times(1).sunrise;
      return tomorrow ? new Date(tomorrow.getTime() - NIGHT_MARGIN) : null;
    }
    return null;
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

  /** The event shown in the map dialog, if any */
  protected readonly mapEvent = signal<HuntingEvent | null>(null);
  private readonly mapDialog = viewChild.required<ElementRef<HTMLDialogElement>>('mapDialog');
  /** The event shown in the photo dialog, if any */
  protected readonly photoEvent = signal<HuntingEvent | null>(null);
  private readonly photoDialog = viewChild.required<ElementRef<HTMLDialogElement>>('photoDialog');
  private readonly injector = inject(Injector);

  constructor() {
    const clock = setInterval(() => this.now.set(Date.now()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(clock));

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

  protected setSort(value: string): void {
    this.store.dispatch(EventsActions.setQuery({ query: { ...this.query(), sort: value as EventSort } }));
  }

  protected setTypeFilter(value: string): void {
    this.store.dispatch(EventsActions.setQuery({ query: { ...this.query(), type: value ? (value as Item) : null } }));
  }

  protected setAnimalFilter(value: string): void {
    this.store.dispatch(EventsActions.setQuery({ query: { ...this.query(), animal: value ? (value as Animal) : null } }));
  }

  /** Shows all events again, keeping the chosen order */
  protected clearFilters(): void {
    this.store.dispatch(EventsActions.setQuery({ query: { ...this.query(), type: null, animal: null } }));
  }

  protected goToPage(pageIndex: number): void {
    this.store.dispatch(EventsActions.loadPage({ pageIndex }));
  }

  protected share(event: HuntingEvent): void {
    this.store.dispatch(EventsActions.shareEvent({ event }));
  }

  protected edit(event: HuntingEvent): void {
    this.store.dispatch(EventsActions.startEdit({ event }));
  }

  protected showOnMap(event: HuntingEvent): void {
    this.mapEvent.set(event);
    // Open once the content is rendered, so focus moves to its close button
    afterNextRender(() => this.mapDialog().nativeElement.showModal(), { injector: this.injector });
  }

  protected closeMap(): void {
    this.mapDialog().nativeElement.close();
  }

  protected showPhoto(event: HuntingEvent): void {
    this.photoEvent.set(event);
    // Open once the content is rendered, so focus moves to its close button
    afterNextRender(() => this.photoDialog().nativeElement.showModal(), { injector: this.injector });
  }

  protected closePhoto(): void {
    this.photoDialog().nativeElement.close();
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
