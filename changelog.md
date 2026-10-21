# Changelog

## 0.53.0

- New "Handloading" / "Přebíjení" page in the side navigation, right below "Firearms and ammunition", with a powder funnel icon. It lists load development series ("Load development" / "Vývoj náboje") in the same style as the other lists, ordered by caliber.
- Its own add button starts a new load development series, beginning with its caliber, chosen from the same common cartridges as for firearms or typed in. The series are kept in a new store of the app's database.

## 0.52.1

- The user guide is loaded entirely on demand. Besides its code and its screenshots, its texts are now kept in their own files (`i18n/guide/<language>.json`) and downloaded only when the guide is opened, in the language in use, so the translations loaded at startup are about a third smaller. The service worker caches them only once opened, like the screenshots, so the guide still works offline after that. While the texts load, the guide shows its heading and a loading message, and an error if they cannot be loaded.

## 0.52.0

- The user guide has its phone screenshots, in Czech and in English: the overview, recording a harvest with its firearm and ammunition, the actions of an event, the map with its options and its press-and-hold menu, the feeding page and a feeding place due for replenishing, the side navigation with its red dots, the firearms and ammunition, adding a handload, and the settings. They show sample records in the Brdy area.

## 0.51.1

- A "User guide" / "Návod" page in the side navigation, with a book icon. It explains the app in sections, with a table of contents: getting started, the overview, recording an event, working with events, the map, feeding, replenishing feeding places, firearms and ammunition, and the settings. The texts are in English and Czech, and each section can show phone screenshots in the selected language, loaded only when scrolled to; the screenshots themselves follow in a later version.
- The section on recording an event covers choosing the firearm and ammunition of a harvest, which are copied into it as they are, and the "Back to my position" button of the location map.
- The new "Firearms and ammunition" section covers adding firearms and ammunition with the add button, the details of a handload, and editing and deleting them.

## 0.51.0

- When a new event's location is moved away from the device's position on the small map, a "Back to my position" / "Zpět na moji polohu" button appears below it and moves the location back to where the device is now. It is also offered for an event added at a point on the map, but not when editing an event, which keeps its recorded location.
- The small location map follows a location set from outside, not only one set by moving it.

## 0.50.1

- The two numbers of a firearm's thread pitch are separated by a colon instead of a slash, in the form and in the list, e.g. "thread pitch 1:10" / "stoupání závitu 1:10".

## 0.50.0

- Firearms have an optional thread pitch, entered as a ratio in two number inputs separated by a slash, styled like the tag number of a harvest (monospace, larger, spaced). Both numbers are needed once either is given, each from 0.1 to 100, with a decimal comma or point. The list shows it as e.g. "thread pitch 5/8" / "stoupání závitu 5/8", and it is copied into new harvests with the rest of the firearm.

## 0.49.0

- A harvest records the firearm and ammunition used: two optional dropdowns in the event form offer only the firearms and ammunition saved on the "Firearms and ammunition" page.
- The chosen firearm and ammunition are copied into the harvest with all their details, without any link back to them, so changing or deleting them later keeps the harvest as it was. Editing a harvest offers the recorded copy, marked "(as recorded)", next to the saved ones.
- The event list shows the firearm and ammunition of a harvest, e.g. "Firearm: Blaser R8 (.308 Win)".

## 0.48.1

- The side navigation item for firearms is now "Zbraně a střelivo" / "Firearms and ammunition", matching its page.

## 0.48.0

- Firearms have an optional barrel length, entered in mm or inches with a unit selector next to the field. It is always stored in mm (inches are converted at 25.4 mm, rounded to 0.1 mm) and shown in the list as e.g. "barrel 560 mm" / "hlaveň 560 mm".

## 0.47.0

- Factory ammunition has an optional make and product name, e.g. "RWS EVO", shown in the list after the caliber.
- Handloads have an optional powder charge in grains and overall cartridge length in mm, shown with the other components. Both accept a decimal comma.

## 0.46.0

- Ammunition can be edited and deleted like firearms: edit and delete buttons on wider screens, and on phones an action menu behind the ⋮ button. Editing opens the dialog filled in with the ammunition, titled "Edit ammunition" / "Upravit střelivo"; deleting asks for confirmation first.

## 0.45.0

- For handloaded ammunition the form also asks for the primer, powder and brass, and how many times the brass has been fired (a whole number from 0 to 99). The fields appear only for a handload and are all optional; the list shows the ones given below the ammunition.

## 0.44.0

- Firearms can be deleted: a delete button on wider screens and "Delete firearm" / "Smazat zbraň" in the phone action menu, after confirming.
- The firearms page is now "Firearms and ammunition" / "Zbraně a střelivo", with a section for each.
- The add button asks first whether a firearm or ammunition is being added, then shows the form for it.
- Ammunition is added with its caliber (the same choice of common cartridges as for firearms, or any other typed in), factory or handload, bullet weight in grains, muzzle velocity in m/s, bullet type (with common types offered) and G1 ballistic coefficient. Caliber, weight and velocity are required; decimals can be typed with a comma or a point. It is kept in a new store of the app's database and listed by caliber and weight.

## 0.43.0

- The firearm form has a "Suppressed" / "S tlumičem hluku výstřelu" checkbox, unchecked by default. Suppressed firearms show "Suppressed" / "S tlumičem" in the list.

## 0.42.1

- The firearms item in the side navigation has a new icon: an upright cartridge with its bullet, instead of a rifle.

## 0.42.0

- Firearms can be edited in the same way as events: an edit button on wider screens, and on phones an action menu behind the ⋮ button. It opens the form filled in with the firearm, titled "Edit firearm" / "Upravit zbraň".

## 0.41.1

- The caliber of a firearm is a combo box: it offers the cartridges common in Czech hunting, from .22 LR to 20/76, and any other can still be typed in.
- Once a sight is chosen for a firearm, a "Make and model" / "Značka a model" field appears for it, e.g. "Zeiss Victory V8 2.8-20×56". It is optional, shown in the list after the kind of sight, and dropped when no optic sight is chosen.

## 0.41.0

- New "Firearms" / "Zbraně" section in the side navigation, with a rifle icon. Its own add button opens a form for a firearm's name, caliber and optics; the optics are chosen from no optic sight (the default), riflescope, red dot sight, thermal sight and night vision sight.
- The firearms are listed by name with their caliber and optics, and are kept in a new store of the app's database.

## 0.40.1

- The feeding place form can take a photo from the gallery as well, with the same "Choose from gallery" / "Vybrat z galerie" button as the event form.

## 0.40.0

- The event form can take a photo from the gallery as well: next to "Take photo", a "Choose from gallery" / "Vybrat z galerie" button opens the phone's gallery instead of the camera. The chosen photo is compressed and stored like a photo taken with the camera.

## 0.39.1

- The feeding icon in the side navigation shows a plain red dot instead of a number while places need replenishing, so it stays round.

## 0.39.0

- Feeding places are only marked as needing replenishing during the feeding season; outside of it no place gets the red band.
- While places need replenishing, the menu button in the header shows a red dot, and the feeding icon in the side navigation a red badge with their number. Screen readers hear the number in the button's label and with the badge.
- The feeding places are loaded when the app starts, so the badges are shown without opening the feeding page first.

## 0.38.0

- Every feeding place records when it was last replenished; it is empty for new places and for places stored before.
- A green "Replenished" / "Doplněno" action in each place's actions, both as an icon button and in the phone menu, records the current date and time.
- The list shows when each place was last replenished, or that it was not replenished yet.
- A place that was never replenished, or not within the replenishment interval, gets a red band along its left edge and a "Needs replenishing" / "Potřebuje doplnit" note. The list checks this every minute, so places become due on their own.

## 0.37.1

- The feeding season badge has more padding and a subtle look: a light green tint with a thin border while the season is in progress, light grey otherwise.

## 0.37.0

- The feeding page starts with two dashboard tiles, in the style of the overview:
  - Feeding season: the first and last month of the season, October to the end of March by default, with a badge telling whether the season is in progress. A season may span the new year.
  - Replenishment: how often feeders are replenished during the season, every 5 days by default, as a whole number from 1 to 60 days.
- Both settings are remembered on the device for the next visit.

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
