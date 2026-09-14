# TEAMI capture comparison — 2026-09-14

## GIS navigation and point catalogue

Update from the newly supplied GIS HAR: map_info, obj_info, objects_point and status_ph are now available. objects_point has 40 objects, status_ph has 87 unique IDs and all codes are 2; the separate aggregate reports 85 points with readings in two days. No equivalence between code 2 and freshness is assumed. Join uses exact source object ID. 39 valid coordinate pairs are plotted in an offline Mercator coordinate diagram with search, selection and zoom. One latitude is the malformed string `48.115544,`; its raw value is retained and it is not plotted. 47 status rows have no coordinates in this capture; this does not prove that coordinates never exist in the source. Basemap tile requests have empty response bodies, so no street imagery is embedded. The original source links remain separate from synchronization. This is a recorded capture, not a live connection. The earlier paragraph below describes the previous archive-only capture.

Preview `/gis` now renders the captured 87-point catalogue with name/code/meter search and a metadata detail panel. The allowlisted snapshot contains only point name/code, meter number/type, point type and mounting dates. The HAR did not contain GIS routes or coordinates in these point rows. No map pins or last-two-days status is synthesized. Separate links open the actual TEAMI and TOSH GIS pages; these links do not synchronize data. The user's screenshot shows 87 points and 85 with readings in the prior two days, which is reported only as screenshot evidence. A GIS network capture is still needed to implement a verified coordinate adapter.

The offline preview now opens a source-comparison page, separate from synthetic DEMO routes. It embeds only an allowlisted subset of the successful `/ec3api/v1/archives/point` response in the user's HAR. Request headers, cookies, session values, URLs, point IDs and row IDs are excluded. No live request or authentication was attempted for this change.

Observed source: 96 contiguous 15-minute intervals on 2026-09-14; 24 numeric readings from 00:00 to 06:00; 72 null readings thereafter. ML 1044 / MD 12 / AGGS 13 is average active power in kW. The source's `measurelines/ml_convert` metadata supplies coefficient 0.25 to ML 1040 energy in kWh. Sum of available readings times coefficient is 72.27 kWh. This is a partial-period energy calculation, not a complete day's use or a monetary bill.

Source BT/ET/READ_TIME are displayed unchanged, without assigning an unverified timezone. HSS/DSS/SFS/TFF_ID and auxiliary flags are retained without inferring live connectivity or billing rates. Nulls remain null in the fixture. The graph shows a separate missing-data marker and never fills missing intervals with zero. Filters expose all/numeric/missing rows.

The shared production archive table now uses understandable column labels, distinguishes zero from no data, and preserves source status columns when supplied by the API. This table does not change production storage or transport behavior. The new source page is preview-only, not a production data source.

Tests reconcile the fixture count and total, check the data-only field allowlist, and server-render the shared table to verify zero/null behavior and HTML escaping. Browser visual verification remains outstanding because the remote browser cannot access the local preview. Production live sync, tariff rules, full audit protection, GIS parity and startup migration preservation remain separate unresolved work.

## OpenStreetMap preview wiring

The preview bundles Leaflet and defaults to OSM tiles over HTTP/HTTPS. The file:// view keeps the offline diagram. CSP allows only OSM image loading plus embedded data; API fetch/connect remains denied. Attribution and strict-origin-when-cross-origin referrer policy are retained. Only visible tiles are requested, with no bulk download. Marker tooltips use textContent.

The Windows launcher locates Python 3 and runs serve_preview.py on a random loopback port, serving only the bundled HTML. Local checks verified HTML 200, traversal 404 and POST 501. Windows execution and browser rendering were unavailable to test; neither is claimed verified. Python 3 and internet are required. Production and live acquisition are unchanged.
