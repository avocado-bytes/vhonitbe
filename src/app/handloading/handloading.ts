import { afterNextRender, Component, effect, ElementRef, inject, Injector, untracked, viewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { LoadSeriesForm } from '../load-series-form/load-series-form';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import { selectFormOpen, selectLoadError, selectLoading, selectSorted } from '../state/handloading/handloading.reducer';

/** Handloading: the user's load development series, each started with the floating add button */
@Component({
  imports: [TranslatePipe, LoadSeriesForm],
  selector: 'app-handloading',
  styleUrl: './handloading.scss',
  templateUrl: './handloading.html',
})
export class Handloading {
  private readonly store = inject(Store);
  private readonly injector = inject(Injector);

  protected readonly series = this.store.selectSignal(selectSorted);
  protected readonly loading = this.store.selectSignal(selectLoading);
  protected readonly loadError = this.store.selectSignal(selectLoadError);
  protected readonly formOpen = this.store.selectSignal(selectFormOpen);
  private readonly formDialog = viewChild.required<ElementRef<HTMLDialogElement>>('formDialog');

  constructor() {
    this.store.dispatch(HandloadingActions.load());

    // The dialog follows the state, so it also closes once a series has been saved
    effect(() => {
      const open = this.formOpen();
      const dialog = untracked(this.formDialog).nativeElement;
      if (open && !dialog.open) {
        // Open once the form is rendered, so focus moves to its first field
        afterNextRender(() => dialog.showModal(), { injector: this.injector });
      } else if (!open && dialog.open) {
        dialog.close();
      }
    });
  }

  protected add(): void {
    this.store.dispatch(HandloadingActions.startAdd());
  }

  protected closeForm(): void {
    this.formDialog().nativeElement.close();
  }

  /** Closing with the close button or Escape cancels the form */
  protected onFormClosed(): void {
    if (this.formOpen()) {
      this.store.dispatch(HandloadingActions.closeForm());
    }
  }
}
