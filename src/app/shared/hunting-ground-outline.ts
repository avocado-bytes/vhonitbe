import type * as Leaflet from 'leaflet';
import { HUNTING_GROUNDS_ATTRIBUTION, HuntingGround } from '../model/hunting-ground';

/** Magenta stands apart from the greens, browns and blues of the topographic map; also used by the legend swatch */
export const HUNTING_GROUND_COLOR = '#c2185b';

/** The boundary of the hunting ground as a dashed line without fill, so the map below stays readable; pass Leaflet in, as some maps load it on demand */
export function huntingGroundOutline(L: typeof Leaflet, ground: HuntingGround): Leaflet.Polygon {
  return L.polygon(
    ground.outline.map((polygon) => polygon.map((ring) => ring.map(({ latitude, longitude }): Leaflet.LatLngTuple => [latitude, longitude]))),
    {
      color: HUNTING_GROUND_COLOR,
      weight: 3,
      opacity: 0.85,
      dashArray: '10 6',
      fill: false,
      interactive: false,
      attribution: HUNTING_GROUNDS_ATTRIBUTION,
    },
  );
}
