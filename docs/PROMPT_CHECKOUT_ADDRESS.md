# Prompt: structured checkout address (as built and approved in AVERIXA, commit 77a0c19)

Copy everything under the line into a new session of another project.

---

Build a structured address block for my shop's checkout page (Next.js storefront, Fastify API, Pakistan, courier TCS). Change only what is listed here.

**Layout.** One bordered group with the heading "Address" (a fieldset with a legend). Inside it, in this order:
1. **City**: a required dropdown of the TCS booking cities, names exactly as TCS writes them. I will paste the list from the TCS portal dropdown; keep all real places and leave out TCS internal entries (TEST, HEAD OFFICE, warehouses, "GEN HEAVY", OLE ...). Customers must not be able to type a city.
2. One row of three boxes: **House name or number** (required), **Street name or number** (required) and **Area, colony or mohalla** (required): a scrollable dropdown filled from the chosen city, with a last choice "My area is not listed"; when that is chosen a typing box "Type your area, colony or mohalla" appears below the row; when the city has no list, the third box is a typing box. Show the note "Area names from OpenStreetMap contributors" under the dropdown.
3. **Additional address info (optional)**, full width, under the row (for example "near Jamia Masjid, 2nd floor").
4. Below the group: **Postal code** (optional).
5. Under the group, a plain text strip (not a box that looks like a form field): "Your full address (filled in automatically)" followed by the joined text, or "It builds itself as you fill in the boxes above." until something is typed.

**Joined address.** `house, street, area, extra info` (empty parts left out, joined with ", "), for example "House 7, Street 3, Abdali Colony, near the park". Carry it with the order in one hidden field named `line1`; the order request and the database stay unchanged. Saved account addresses and the "remember me on this device" details fill the whole text.

**Area data (real data, no inventing).** Download the Pakistan extract from Geofabrik (download.geofabrik.de/asia/pakistan-latest.osm.pbf, about 150 MB; ask me before downloading), read it with the Python package pyosmium, keep place nodes and place shapes (city, town, village, suburb, neighbourhood, quarter) plus named residential land use with English or Latin-script names (at least one letter, 3 to 60 characters). Give each place to the nearest TCS city that has a map point (a place with the same name): within 28 km of a city, 14 km of a town, 7 km of a village; at most 1,000 names per city. Write one small JSON file per city to `public/areas/<city-slug>.json` and load it only when that city is chosen (nothing added to the first page load). Tell me the counts per major city and the cities with few or no names. Do not build a street dropdown: only about 5% of Pakistan's road segments have a name in OpenStreetMap, so street data is too thin to promise.

**Admin.** In the admin store settings, group "Checkout form": a box "Customers typing their own city" with "Not allowed: pick from the TCS list" (default) and "Allowed: they can type any city (the TCS list is suggested)". The existing setting for the street address (required, optional, hidden) controls house, street and area together.

**Rules.** No new library in the first load. Respect the page-size budget (shared JS 110 kB or less, any page 145 kB or less). Keep OpenStreetMap attribution visible (ODbL). Keep the checkout otherwise exactly as it is.

**Verify and report.** Type-check, build, then in a real browser: choose a city, fill the three boxes, pick an area, check the strip and the hidden field, choose "not listed" and check the typing box, and check a city with no list. Say plainly what was and was not tested (real order, saved address, phone width). Update the changelog, commit and push.
