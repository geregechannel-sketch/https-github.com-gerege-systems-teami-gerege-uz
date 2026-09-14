# TEAMI capture comparison — 2026-09-14

## GIS navigation and point catalogue

Preview `/gis` now renders the captured 87-point catalogue with name/code/meter search and a metadata detail panel. The allowlisted snapshot contains only point name/code, meter number/type, point type and mounting dates. The HAR did not contain GIS routes or coordinates in these point rows. No map pins or last-two-days status is synthesized. Separate links open the actual TEAMI and TOSH GIS pages; these links do not synchronize data. The user's screenshot shows 87 points and 85 with readings in the prior two days, which is reported only as screenshot evidence. A GIS network capture is still needed to implement a verified coordinate adapter.

The offline preview now opens a source-comparison page, separate from synthetic DEMO routes. It embeds only an allowlisted subset of the successful `/ec3api/v1/archives/point` response in the user's HAR. Request headers, cookies, session values, URLs, point IDs and row IDs are excluded. No live request or authentication was attempted for this change.

Observed source: 96 contiguous 15-minute intervals on 2026-09-14; 24 numeric readings from 00:00 to 06:00; 72 null readings thereafter. ML 1044 / MD 12 / AGGS 13 is average active power in kW. The source's `measurelines/ml_convert` metadata supplies coefficient 0.25 to ML 1040 energy in kWh. Sum of available readings times coefficient is 72.27 kWh. This is a partial-period energy calculation, not a complete day's use or a monetary bill.

Source BT/ET/READ_TIME are displayed unchanged, without assigning an unverified timezone. HSS/DSS/SFS/TFF_ID and auxiliary flags are retained without inferring live connectivity or billing rates. Nulls remain null in the fixture. The graph shows a separate missing-data marker and never fills missing intervals with zero. Filters expose all/numeric/missing rows.

The shared production archive table now uses understandable column labels, distinguishes zero from no data, and preserves source status columns when supplied by the API. This table does not change production storage or transport behavior. The new source page is preview-only, not a production data source.

Tests reconcile the fixture count and total, check the data-only field allowlist, and server-render the shared table to verify zero/null behavior and HTML escaping. Browser visual verification remains outstanding because the remote browser cannot access the local preview. Production live sync, tariff rules, full audit protection, GIS parity and startup migration preservation remain separate unresolved work.
