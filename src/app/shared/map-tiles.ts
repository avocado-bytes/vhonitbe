/** OpenTopoMap outdoor tiles (free, no API key; fair-use policy applies) */
export const OPEN_TOPO_MAP_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
export const OPEN_TOPO_MAP_MAX_ZOOM = 17;
export const OPEN_TOPO_MAP_ATTRIBUTION =
  'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
  '<a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> ' +
  '(<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';

/**
 * Tile layer options shared by all maps. Tiles are requested with CORS (OpenTopoMap allows it),
 * so the service worker gets readable responses it can cache for offline use.
 */
export const OPEN_TOPO_MAP_OPTIONS = {
  maxZoom: OPEN_TOPO_MAP_MAX_ZOOM,
  attribution: OPEN_TOPO_MAP_ATTRIBUTION,
  crossOrigin: true,
} as const;
