import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { EventList } from '../event-list/event-list';
import { FeedingMap } from '../feeding-map/feeding-map';
import { EventSort } from '../model/event';
import { FEEDING_ITEMS, FeedingItem } from '../model/item';
import { selectDeleteError } from '../state/events/events.reducer';
import { FeedingActions } from '../state/feeding/feeding.actions';
import {
  selectCurrentPage,
  selectItem,
  selectLoadError,
  selectLoading,
  selectLocated,
  selectPage,
  selectPageCount,
  selectSort,
  selectTotal,
} from '../state/feeding/feeding.reducer';

/** A dashboard of the places where game is fed: a map of all feeders and salt licks and a list of their events */
@Component({
  imports: [TranslatePipe, EventList, FeedingMap],
  selector: 'app-feeding',
  styleUrl: './feeding.scss',
  templateUrl: './feeding.html',
})
export class Feeding {
  private readonly store = inject(Store);

  protected readonly items = FEEDING_ITEMS;
  protected readonly located = this.store.selectSignal(selectLocated);
  protected readonly events = this.store.selectSignal(selectPage);
  protected readonly total = this.store.selectSignal(selectTotal);
  protected readonly pageIndex = this.store.selectSignal(selectCurrentPage);
  protected readonly pageCount = this.store.selectSignal(selectPageCount);
  protected readonly sort = this.store.selectSignal(selectSort);
  protected readonly item = this.store.selectSignal(selectItem);
  protected readonly loading = this.store.selectSignal(selectLoading);
  protected readonly loadError = this.store.selectSignal(selectLoadError);
  protected readonly deleteError = this.store.selectSignal(selectDeleteError);

  constructor() {
    this.store.dispatch(FeedingActions.load());
  }

  protected setSort(value: string): void {
    this.store.dispatch(FeedingActions.setSort({ sort: value as EventSort }));
  }

  protected setItem(value: string): void {
    this.store.dispatch(FeedingActions.setItem({ item: value ? (value as FeedingItem) : null }));
  }

  protected goToPage(pageIndex: number): void {
    this.store.dispatch(FeedingActions.goToPage({ pageIndex }));
  }
}
