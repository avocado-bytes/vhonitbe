# Changelog

## 0.20.0

- Add a photo button to events with a photo in the overview, opening a dialog that shows the photo, like the map button does for the location.

## 0.19.0

- Add a photo to an event when adding or editing it; on phones the camera opens. Photos are scaled down to 1600 px and re-encoded as WebP (or JPEG), which also removes their metadata such as the GPS position, and stored locally in a separate photo store.
- Deleting an event or replacing its photo also deletes the old photo.

## 0.18.0

- Show a note in the map panel while the position is set by hand.
- Show a night card on the dashboard from one hour after sunset until one hour before sunrise, when some game may not be hunted, with the time the night period ends.

## 0.17.0

- Add "Manual position" to the map's context menu: it turns off tracking and follow me and sets the user's position to the chosen point. Device positions are ignored until tracking is turned on again, which looks up the device position right away.

## 0.16.1

- Add a "Clear filters" button to the dashboard's event list, shown while a filter is active; the sort order is kept.

## 0.16.0

- Sort the events on the dashboard newest or oldest first, and filter them by event type and animal. Paging and the event count follow the filters; the map keeps showing the newest events unfiltered.

## 0.15.0

- Add a map button to events with a location in the overview, opening a dialog with a map that shows where the event happened.
- Show the event's date below its type in the overview, so the action buttons fit on phones.

## 0.14.2

- Add a note to the wind cone legend that terrain, forest and valleys can change the wind's direction and strength.

## 0.14.1

- Show a legend for the wind cone on the map with its current length and wind speed, and how the length follows the wind speed (100 m in calm wind up to 500 m at 8 m/s).

## 0.14.0

- Refresh the weather and wind every 15 minutes while the map is open, so the wind cone stays current.
- The wind cone's length follows the wind speed: 100 m in calm wind (1 m/s or less), growing to 500 m at 8 m/s and more.

## 0.13.0

- Add a wind card to the dashboard with the wind speed, an arrow pointing where the wind blows and the direction it comes from.
- Add a map option showing a yellow cone fanning out 30° and 300 m from the user's position in the direction the wind blows, where the user's scent travels.

## 0.12.0

- Turn the overview into a dashboard: cards with today's sunrise and sunset, the moon phase and the current weather at the user's position, above the events.
- Sunrise, sunset and the moon phase are calculated on the device; the weather comes from Open-Meteo.
- Enable Bootstrap's card and spinner styles; the loading spinners on the map didn't show before.

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
