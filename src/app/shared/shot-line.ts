import type { DivIconOptions, PolylineOptions } from 'leaflet';

/** The color of the shooter's position and the line of the shot, apart from the green event pin and the magenta boundary */
const SHOT_COLOR = '#c2410c';

/** A round marker with a crosshair where the shooter stood; pass to `L.divIcon` */
export const SHOOTER_MARKER_OPTIONS: DivIconOptions = {
  className: 'shooter-marker',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="${SHOT_COLOR}" stroke="#fff" stroke-width="2"/>
    <path d="M12 5v4M12 15v4M5 12h4M15 12h4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
};

/** The dashed line from the shooter's position to the location of the harvest */
export const SHOT_LINE_OPTIONS: PolylineOptions = {
  color: SHOT_COLOR,
  weight: 3,
  dashArray: '8 6',
  interactive: false,
};
