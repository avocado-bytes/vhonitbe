import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { EventStorage } from '../storage/event-storage';

/** Loads an event's photo from storage and shows it */
@Component({
  imports: [TranslatePipe],
  selector: 'app-event-photo',
  styleUrl: './event-photo.scss',
  templateUrl: './event-photo.html',
})
export class EventPhoto implements OnInit {
  readonly photoId = input.required<string>();

  private readonly storage = inject(EventStorage);
  protected readonly url = signal<string | null>(null);
  protected readonly status = signal<'loading' | 'loaded' | 'missing'>('loading');

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      const url = this.url();
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
  }

  ngOnInit(): void {
    this.storage.getPhoto(this.photoId()).then(
      (photo) => {
        if (photo) {
          // An object url shows the photo without reading it into memory as text
          this.url.set(URL.createObjectURL(photo));
          this.status.set('loaded');
        } else {
          this.status.set('missing');
        }
      },
      () => this.status.set('missing'),
    );
  }
}
