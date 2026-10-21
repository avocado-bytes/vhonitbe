import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, Component, computed, DOCUMENT, effect, ElementRef, inject, Injector, signal, untracked, viewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AmmunitionForm } from '../ammunition-form/ammunition-form';
import { FirearmForm } from '../firearm-form/firearm-form';
import { Firearm } from '../model/firearm';
import { FocusTrap } from '../shared/focus-trap';
import { Ammunition } from '../model/ammunition';
import { AmmunitionActions } from '../state/ammunition/ammunition.actions';
import {
  selectDeleteError as selectAmmunitionDeleteError,
  selectDeleting as selectAmmunitionDeleting,
  selectEditing as selectEditingAmmunition,
  selectLoadError as selectAmmunitionLoadError,
  selectLoading as selectAmmunitionLoading,
  selectSorted as selectSortedAmmunition,
} from '../state/ammunition/ammunition.reducer';
import { FirearmsActions } from '../state/firearms/firearms.actions';
import {
  selectDeleteError,
  selectDeleting,
  selectEditing,
  selectFormOpen,
  selectLoadError,
  selectLoading,
  selectSorted,
} from '../state/firearms/firearms.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';

/** What the add dialog adds */
const ADD_KINDS = ['firearm', 'ammunition'] as const;
type AddKind = (typeof ADD_KINDS)[number];

/**
 * The user's firearms and ammunition. The floating add button adds either, chosen first in its dialog.
 * Both are edited or deleted from their actions; as in the event list, phones collect the actions
 * in a menu behind a single button.
 */
@Component({
  imports: [TranslatePipe, NgTemplateOutlet, FirearmForm, AmmunitionForm, FocusTrap],
  selector: 'app-firearms',
  styleUrl: './firearms.scss',
  templateUrl: './firearms.html',
  host: {
    '(document:keydown.escape)': 'closeActions()',
  },
})
export class Firearms {
  private readonly store = inject(Store);
  private readonly injector = inject(Injector);
  private readonly translate = inject(TranslateService);
  private readonly window = inject(DOCUMENT).defaultView;

  protected readonly firearms = this.store.selectSignal(selectSorted);
  protected readonly loading = this.store.selectSignal(selectLoading);
  protected readonly loadError = this.store.selectSignal(selectLoadError);
  private readonly deleting = this.store.selectSignal(selectDeleting);
  protected readonly deleteError = this.store.selectSignal(selectDeleteError);
  protected readonly formOpen = this.store.selectSignal(selectFormOpen);
  /** The firearm being edited; null while adding a new one */
  protected readonly editing = this.store.selectSignal(selectEditing);
  protected readonly ammunition = this.store.selectSignal(selectSortedAmmunition);
  protected readonly ammunitionLoading = this.store.selectSignal(selectAmmunitionLoading);
  protected readonly ammunitionLoadError = this.store.selectSignal(selectAmmunitionLoadError);
  protected readonly ammunitionDeleteError = this.store.selectSignal(selectAmmunitionDeleteError);
  private readonly ammunitionDeleting = this.store.selectSignal(selectAmmunitionDeleting);
  /** The ammunition being edited in the dialog, if any */
  protected readonly editingAmmunition = this.store.selectSignal(selectEditingAmmunition);
  private readonly language = this.store.selectSignal(selectLanguage);
  private readonly numberFormat = computed(() => new Intl.NumberFormat(this.language(), { maximumFractionDigits: 3 }));

  protected readonly kinds = ADD_KINDS;
  /** What the add dialog adds; chosen anew each time it opens */
  protected readonly addKind = signal<AddKind | null>(null);
  protected readonly dialogTitle = computed(() => {
    if (this.editing()) {
      return 'FIREARMS.FORM.EDIT_TITLE';
    }
    if (this.editingAmmunition()) {
      return 'AMMUNITION.FORM.EDIT_TITLE';
    }
    const kind = this.addKind();
    return kind === 'firearm' ? 'FIREARMS.FORM.ADD_TITLE' : kind === 'ammunition' ? 'AMMUNITION.FORM.ADD_TITLE' : 'FIREARMS.FORM.ADD_ANY_TITLE';
  });
  /** Id of the firearm or ammunition whose action menu is open on phones, if any */
  protected readonly actionsFor = signal<string | null>(null);
  private readonly formDialog = viewChild.required<ElementRef<HTMLDialogElement>>('formDialog');

  constructor() {
    this.store.dispatch(FirearmsActions.load());
    this.store.dispatch(AmmunitionActions.load());

    // The dialog follows the state, so it also closes once a firearm has been saved
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

  protected toggleActions(id: string): void {
    this.actionsFor.update((open) => (open === id ? null : id));
  }

  protected closeActions(): void {
    this.actionsFor.set(null);
  }

  protected edit(firearm: Firearm): void {
    this.store.dispatch(FirearmsActions.startEdit({ firearm }));
  }

  protected isDeleting(id: string): boolean {
    return this.deleting().includes(id);
  }

  protected delete(id: string): void {
    if (this.window?.confirm(this.translate.instant('FIREARMS.DELETE_CONFIRM'))) {
      this.store.dispatch(FirearmsActions.deleteFirearm({ id }));
    }
  }

  protected editAmmunition(ammunition: Ammunition): void {
    this.store.dispatch(AmmunitionActions.startEdit({ ammunition }));
  }

  protected isDeletingAmmunition(id: string): boolean {
    return this.ammunitionDeleting().includes(id);
  }

  protected deleteAmmunition(id: string): void {
    if (this.window?.confirm(this.translate.instant('AMMUNITION.DELETE_CONFIRM'))) {
      this.store.dispatch(AmmunitionActions.deleteAmmunition({ id }));
    }
  }

  protected formatNumber(value: number): string {
    return this.numberFormat().format(value);
  }

  protected selectKind(value: string): void {
    this.addKind.set(value as AddKind);
  }

  protected add(): void {
    this.addKind.set(null);
    this.store.dispatch(FirearmsActions.startAdd());
  }

  protected closeForm(): void {
    this.formDialog().nativeElement.close();
  }

  /** Closing with the close button or Escape cancels the form */
  protected onFormClosed(): void {
    if (this.formOpen()) {
      this.store.dispatch(FirearmsActions.closeForm());
    }
  }
}
