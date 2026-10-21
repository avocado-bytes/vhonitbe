import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { selectLanguage } from '../state/settings/settings.reducer';

interface GuideSection {
  /** Key of the section in the GUIDE translations, also its anchor */
  id: string;
  /** Names of the phone screenshots in public/guide/<language>/, each with a caption in GUIDE.SHOTS */
  screenshots: readonly string[];
}

/** The sections in reading order; their texts are in the GUIDE translations */
export const GUIDE_SECTIONS: readonly GuideSection[] = [
  { id: 'start', screenshots: [] },
  { id: 'overview', screenshots: ['overview'] },
  { id: 'add-event', screenshots: ['add-event'] },
  { id: 'event-actions', screenshots: ['event-actions'] },
  { id: 'map', screenshots: ['map', 'map-menu'] },
  { id: 'feeding', screenshots: ['feeding'] },
  { id: 'replenishing', screenshots: ['feeding-list', 'navigation'] },
  { id: 'firearms', screenshots: ['firearms', 'add-ammunition'] },
  { id: 'settings', screenshots: ['settings'] },
];

/** A user guide with phone screenshots in the selected language */
@Component({
  imports: [TranslatePipe],
  selector: 'app-guide',
  styleUrl: './guide.scss',
  templateUrl: './guide.html',
})
export class Guide {
  protected readonly sections = GUIDE_SECTIONS;
  protected readonly language = inject(Store).selectSignal(selectLanguage);

  /** Scrolls within the page rather than navigating, so the router stays on the guide */
  protected scrollTo(id: string): void {
    document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
