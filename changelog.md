# Changelog

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
