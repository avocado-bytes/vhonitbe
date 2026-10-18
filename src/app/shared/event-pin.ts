import type { DivIconOptions } from 'leaflet';

/** A pin in the given color, so events are easy to tell apart from the round "you are here" marker; pass to `L.divIcon` */
export function eventPinOptions(color: string): DivIconOptions {
  return {
    className: 'event-marker',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36" aria-hidden="true">
    <path d="M14 1C7 1 1.5 6.5 1.5 13.5 1.5 23 14 35 14 35s12.5-12 12.5-21.5C26.5 6.5 21 1 14 1z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="14" cy="13.5" r="5" fill="#fff"/>
  </svg>`,
    iconSize: [28, 36],
    iconAnchor: [14, 35],
    popupAnchor: [0, -32],
  };
}

export const EVENT_PIN_OPTIONS: DivIconOptions = eventPinOptions('#22392a');
