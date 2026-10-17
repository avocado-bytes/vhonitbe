# Changelog

## 0.11.2

- Lower the safety distance from buildings in the shooting safety overlay from 200 m to 100 m.

## 0.11.1

- The shooting safety analysis only restarts once the user has moved more than 20 m and further than the accuracy of the reported position, so position jitter while standing still doesn't restart it.

## 0.11.0

- Store the building data for the shooting safety overlay locally in IndexedDB, per tile. Stored tiles are used right away, also offline, and loaded again in the background once they are older than 30 days. This replaces the service worker cache for building data, which didn't keep the responses.

## 0.10.0

- The shooting safety overlay only takes buildings into account; roads, forest tracks, paths and railways are no longer considered.
- Show the terrain overlay as soon as the elevation data is analyzed and load the building data in the background, adding the building zones once it arrives.

## 0.9.0

- Take buildings, roads, paths and railways from OpenStreetMap into account in the shooting safety overlay: a line of fire passing within 200 m of a building or within 50 m of a road or path (beyond 50 m from the user) is marked red.
- Show the 200 m zones around buildings as stripes on the overlay.
- Cache the building and road data for offline use for up to 90 days.

## 0.8.0

- Mark regions in yellow on the shooting safety overlay where the terrain stops the bullet further behind the target (within 300 m, allowing for a shot 0.5° high), so the ground in between is in the line of fire.

## 0.7.0

- Follow me only re-centers the map once the user is more than 30% of the map's width or height away from its center, so the map doesn't shift with every position update.
- Panning the map by hand turns follow me off.

## 0.6.0

- Add map options to turn off tracking the user's location and to follow the user, keeping the map centered on their position. Both are on by default.

## 0.5.0

- Refresh the user's position every 10 seconds while the map is open; the position marker, distance circles and shooting safety overlay follow it.
- The map only centers on the user's first position, so later updates keep the current view.

## 0.4.0

- Add a map option that shows circles 100, 150 and 200 meters around the user.

## 0.3.0

- Load and analyze the elevation data for the shooting safety overlay in a web worker, so the map stays responsive.
- Show a loading overlay on the map while the elevation data is loaded and analyzed.
- Cache map and elevation tiles for offline use for up to a year (up to 10,000 map tiles and 500 elevation tiles).

## 0.2.0

- Add a shooting safety overlay to the map (first version). When enabled, elevation data around the user is loaded and the map is shaded green where the terrain stops a bullet shortly behind the target and red where it doesn't.

## 0.1.0

- Show the application version in the settings menu.
