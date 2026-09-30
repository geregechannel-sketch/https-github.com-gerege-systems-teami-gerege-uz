# TEAMI / TOSH System Parity Audit

Audit date: 2026-09-30

## Method

- Opened the source TEAMI and local TOSH applications in separate authenticated browser tabs.
- Compared all 11 primary sidebar modules at the same `1920x889` viewport.
- Checked route resolution, visible controls, grid/form structure, empty and populated states, and browser console errors.
- Exercised the GIS marker, detail popup, daily-profile link, quality-report link, and target-route selection end to end.
- Kept TOSH additions when they provide working data or faster operation instead of replacing them with an empty source state.

## Primary-module result

| Module | Source route | TOSH route | Audit result |
| --- | --- | --- | --- |
| Saved forms | `/teami/saved_forms` | `/saved` | Two-pane saved-form workspace present |
| Archives | `/teami/archives` | `/archives` | Filter/tree/viewer flow present; GIS point deep-link works |
| Quality reports | `/teami/quality_reports` | `/quality_reports` | Filter/report flow present; GIS point deep-link repaired |
| Event register | `/teami/event_log` | `/events/all` | Overview/navigation preserved; TOSH adds a populated operational grid |
| Reading acquisition | `/teami/show` | `/show` | Point/parameter selection and task/result flow present |
| System configuration | `/teami/system_config` | `/` and `/m/*` | Configuration modules and generic CRUD surface present |
| Reports | `/teami/reports` | `/reports/viewer` | Viewer, automation and log routes present |
| Telesignals | `/teami/telesignalization` | `/telesignals/overview` | Overview, signals and history/control routes present |
| Schemes | `/teami/schemes_description` | `/schemes/overview` | Overview and viewer routes present |
| GIS | `/teami/GIS_V2` | `/gis` | 87 points, source marker assets, source framing and popup/link flow present |
| Load control | `/teami/disconnector_limiter` | `/load-control/relays` | Source geometry and controls present; TOSH retains actionable relay data |

All 11 source routes and all 11 corresponding TOSH routes loaded successfully. No browser console errors were recorded during the route sweep.

## GIS precision work

- Replaced the approximate CSS pins with the source `22x30` `pinGreen.png` and `pinGray.png` assets.
- Matched the ArcGIS `yoffset: 5` geometry with a Leaflet `[11, 20]` icon anchor.
- Restored source behavior where 87 records occupy 46 distinct coordinate slots instead of visually spreading duplicate coordinates.
- Reframed the initial map view against the source at zoom level 16 and restored the metric scale bar.
- Preserved a visible selected-point highlight without replacing the source status color.
- Verified the five detail sections and four daily-reading rows.
- Verified `/archives?point=<id>&view=profile` and repaired `/quality_reports?point=<id>` so it selects the point and expands its parent groups.

## Intentional TOSH advantages retained

- Populated event, report and relay tables remain available even where the source opens in an empty state.
- TOSH reference dictionaries remain in the sidebar.
- GIS links navigate in the current application and keep the selected point context.
- The implementation keeps Leaflet internally; parity is enforced at the visible behavior and geometry level rather than claiming the ArcGIS runtime.

## Verification gates

- Browser route sweep: 11/11 source routes and 11/11 TOSH routes loaded.
- Browser console: zero errors in both audit tabs.
- GIS data: 87 markers, 86 green, 1 gray, 46 distinct source coordinate positions.
- Backend surface guard: at least 380 models, 500 sub-actions and 900 combined endpoints.

