import { afterNextRender, Component, computed, effect, ElementRef, inject, Injector, untracked, viewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { LoadSeriesForm } from '../load-series-form/load-series-form';
import { HandloadingActions } from '../state/handloading/handloading.actions';
import { selectEditingLoad, selectEditingSeries, selectForm, selectLoadSeries } from '../state/handloading/handloading.reducer';
import { TestLoadForm } from '../test-load-form/test-load-form';

/**
 * The dialog for a load development series or one of its test loads, shared by the list of series and the page
 * of a series. It follows the state, so it opens when a form is started and closes once it has been saved.
 */
@Component({
  imports: [TranslatePipe, LoadSeriesForm, TestLoadForm],
  selector: 'app-handloading-dialog',
  templateUrl: './handloading-dialog.html',
})
export class HandloadingDialog {
  private readonly store = inject(Store);
  private readonly injector = inject(Injector);

  protected readonly form = this.store.selectSignal(selectForm);
  protected readonly editingSeries = this.store.selectSignal(selectEditingSeries);
  protected readonly loadSeries = this.store.selectSignal(selectLoadSeries);
  protected readonly editingLoad = this.store.selectSignal(selectEditingLoad);
  protected readonly title = computed(() => {
    if (this.form() === 'load') {
      return this.editingLoad() ? 'HANDLOADING.LOAD_FORM.EDIT_TITLE' : 'HANDLOADING.LOAD_FORM.ADD_TITLE';
    }
    return this.editingSeries() ? 'HANDLOADING.FORM.EDIT_TITLE' : 'HANDLOADING.FORM.ADD_TITLE';
  });
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const open = this.form() !== null;
      const dialog = untracked(this.dialog).nativeElement;
      if (open && !dialog.open) {
        // Open once the form is rendered, so focus moves to its first field
        afterNextRender(() => dialog.showModal(), { injector: this.injector });
      } else if (!open && dialog.open) {
        dialog.close();
      }
    });
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /** Closing with the close button or Escape cancels the form */
  protected onClosed(): void {
    if (this.form()) {
      this.store.dispatch(HandloadingActions.closeForm());
    }
  }
}
