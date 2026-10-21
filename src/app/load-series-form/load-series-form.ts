import { Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { COMMON_CALIBERS } from '../model/firearm';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import { selectSaveError, selectSaving } from '../state/handloading/handloading.reducer';

/** Starts a load development series with its caliber, picked from the common ones or typed in */
@Component({
  imports: [TranslatePipe],
  selector: 'app-load-series-form',
  templateUrl: './load-series-form.html',
})
export class LoadSeriesForm {
  private readonly store = inject(Store);

  protected readonly calibers = COMMON_CALIBERS;

  readonly caliber = signal('');

  protected readonly saving = this.store.selectSignal(selectSaving);
  protected readonly error = this.store.selectSignal(selectSaveError);
  protected readonly canSubmit = computed(() => !!this.caliber().trim() && !this.saving());

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    this.store.dispatch(HandloadingActions.addSeries({ series: { caliber: this.caliber().trim() } }));
  }
}
