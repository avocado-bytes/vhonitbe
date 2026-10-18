# Changelog

## 0.36.1

- The type placeholder in the feeding place form reads "Vyberte druh krmeliště" / "Select the kind of feeding site".

## 0.36.0

- New types of feeding places: feed pile (hromada) and baiting spot (zásyp), next to the feeder (krmelec) and the salt lick (slanisko). They have their own pin colors on the feeding map and legend: ochre for feed piles and plum for baiting spots.
- The feeder type is now called "Feeder" / "Krmelec" instead of "Feeding" / "Přikrmování"; places already stored keep their type.
- The type placeholder in the form reads "Select the type of place" / "Vyberte typ místa", and the list is ordered feeder, feed pile, baiting spot, salt lick.

## 0.35.0

- Feeders and salt licks are now feeding places, a model of their own apart from the events: a type, location, note and photo, with no date. They are kept in their own database store; existing feeders and salt licks recorded as events are moved there automatically on the first start of this version, keeping their location, note and photo.
- The event list, its count and filter, and the main map's latest events only ever contain events, without having to leave feeding places out.
- The feeding page has its own form and list for feeding places. The list is filtered by type and ordered by type and note, as places have no date; each place can be shown on a map or with its photo, shared, edited and deleted.
- Sharing a feeding place sends its type and location with its photo; the date is left out, as places have none.
- The map popups of feeding places show only their type.

## 0.34.0

- Feeders and salt licks no longer appear on the main overview: they are left out of its event list, its count and pages, and its type filter.
- The main map's latest 10 events no longer include feeders and salt licks either; they are shown on the feeding page's map.

## 0.33.0

- Feeders and salt licks are no longer offered as event types in the add dialog. They are added on the feeding page with its own add button, which offers only these two types; the general add button is hidden there.
- A feeder or salt lick is recorded without a date: the date field is left out and the time it was first saved is kept. Editing an existing feeder or salt lick, from any list or the map, offers only these two types and keeps its date.
- The add dialog is titled "Add feeding place" / "Edit feeding place" for feeders and salt licks.

## 0.32.0

- Add a "Feeding" section to the side navigation, with a hay rack (krmelec) icon. It opens a feeding dashboard with:
  - a small map of all feeders and salt licks with a location, zoomed to fit them, with brown pins for feeding and blue pins for salt licks, a legend, and popups naming each place and its date;
  - a list of the feeding and salt lick events, with sorting, a filter for one of the two types, and pages of 10, with the same details and actions as the main event list.
- The add button also works on the feeding page.
- The event list with its actions and photo and map dialogs is now a shared component, used by both the main dashboard and the feeding page.

## 0.31.0

- A language selected in the settings is remembered in local storage and used on the next start ahead of the browser's languages. Without a stored choice, or when storage is unavailable, the browser's languages decide as before.

## 0.30.0

- The tag number is only asked for when harvesting hoofed game (fallow, red, white-tailed and sika deer, roe deer, chamois, wild goat, mouflon and wild boar). Other game mammals and regulated species such as raccoon don't get tags.
- The event list shows the tag number below the animal, e.g. "Tag number 12 345678".
- The shared event message includes the tag number after the date.

## 0.29.0

- Add an optional tag number to harvest events of a mammal: game mammals and regulated mammals such as raccoon or coypu.
- The field opens the numeric keyboard, accepts only digits (also when pasted), adds the space between the 2 digit and 6 digit sections on its own, and shows the digits still missing as a faint "00 000000" mask in a large monospace font. Backspace after the space deletes the digit before it.
- An incomplete number blocks saving and is pointed out once the field is left. The digits are stored without the space, and are not saved once the event is no longer a harvested mammal.

## 0.28.1

- The shared event message no longer includes a Google Maps link. Only the Mapy.cz link to the location is kept.

## 0.28.0

- The shared event message includes the sex and herd after the animal, e.g. "Sighting – Roe deer · Mixed · Herd of 7".
- The note is no longer included in the shared message.

## 0.27.0

- The event list shows the sex and herd next to the animal, separated by dots, e.g. "Roe deer · Mixed · Herd of 7". It shows just "Herd" when the herd size was not counted.

## 0.26.0

- A sighting marked as a herd can record the number of animals: an optional whole number of at least 2, stored as the event's herd size.
- The sex dropdown offers "Mixed" for a herd. The herd checkbox now comes right after the animal, before the sex.
- A herd size or mixed sex entered for a herd is not saved once the sighting is no longer marked as a herd.

## 0.25.0

- Add an optional sex (male or female) to the add and edit item form for event types with an animal.
- Add a "Herd" checkbox for sightings, to record whether several animals were seen together or an individual.
- Both are stored with the event. Older events without them work as before. A sex or herd entered before switching to a type that doesn't offer it is not saved.

## 0.24.0

- The add and edit item form first shows only the event type. The other fields and the save button appear once a type is selected.
- The animal field is only shown for event types that concern an animal. It is hidden for feeding, salt lick, hunting stand and trail camera, and such events are saved without an animal, even if one was chosen before switching the type.

## 0.23.0

- On phones each event in the list shows a single three dots button in place of its action icons. It opens a menu listing the actions with their names: show photo, show on map, share, edit and delete. The menu closes after choosing an action, on a tap outside it, or with Escape. Larger screens keep the icon buttons.

## 0.22.0

- Share an event to a messaging app such as WhatsApp or Messenger, using a new share button in the event list or "Share item" in the map's menu for an event marker. The phone's share sheet opens with the event as a plain text message: the type and animal, the date, the note, the coordinates, and Google Maps and Mapy.cz links to the location. The photo is attached as a JPEG if there is one, but some apps may drop the text when a photo is attached.
- Browsers without a share sheet, such as Firefox on desktop, copy the text to the clipboard instead and show a short notice.

## 0.21.1

- On phones, tapping the map closes the open options and legend panel. That tap only closes the panel and does not open the map menu.

## 0.21.0

- On phones the map's options and legend panel is collapsed behind a small round button in the top right corner of the map, which shows and hides it. When open, the panel scrolls if it is taller than the map. On larger screens the panel is always shown as before.

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
