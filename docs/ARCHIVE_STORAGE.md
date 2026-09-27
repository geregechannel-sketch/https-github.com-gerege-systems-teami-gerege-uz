# Local archive read contract

This implements local archive reads, not an automatic TEAMI connection. No production data or credentials are included and no ingestion API is exposed yet.

`archive_samples` stores explicitly mapped point/ML/MD/AGGS, interval start/end, exact numeric value, unit, original status, source reference and receipt time. A future source adapter must verify source ID mapping and preserve provenance before loading data. There are no default readings. A database administrator can still write this table; provenance is not cryptographically verified.

GET measurementsarchives?POINT_ID=... lists combinations present in local samples. POST archives/point accepts POINT_ID, ML_ID, MD_ID, AGGS_ID, FROM, TO and optional INCLUDE_OVERLAP (default false). Timestamps require RFC3339 offsets; start-inclusive/end-exclusive interval-start selection is used. Intervals are returned intact, never prorated or aggregated. Results use UTC timestamps, numeric strings and unchanged source status. The UI chooses whole calendar dates in UTC+08:00 and converts the end date to the following midnight. Other archive actions still return 501.

Reads require reports or config privilege (wildcard admins included), consistent with existing global role privileges. Per-point user scopes are not implemented; do not claim tenant/point isolation. Maximum query span 366 days, 10000 returned rows, 20-second DB timeout. Oversized results fail explicitly rather than silently truncate. Parameters are limited to 1000 combinations. No tariff calculations, status interpretation, live collector or deployment is included.

Validation covers parameter isolation, period boundary, offset conversion, decimal precision, source status, empty result, invalid date and unauthenticated request. PostgreSQL CI is required before merge.

## Local coverage screen

`/m/qualityreports` now reads local samples through the archive API. With INCLUDE_OVERLAP=true, the query includes intervals starting before FROM but ending after FROM, still requiring begin_time < TO. Returned intervals and values remain intact; only the coverage display clips intervals to the selected elapsed period.

The display separates represented, unrepresented and future time. Union coverage never counts overlap twice. Raw source statuses are counted without assigning good/bad meaning. Empty local data is not proof of upstream failure; expected sampling frequency and source status semantics remain unverified. Totals use the entire response; the detail table explicitly limits display to 500 segments. The point list warns when the first 1000 points are incomplete.

Calendar selectors use UTC+08. Unit tests cover gaps, future time, crossing and nested intervals, invalid dates, raw statuses, UTC+08 rollover and query limits. PostgreSQL API tests check optional overlap selection and unchanged default behavior. CI now also checks TypeScript, coverage tests and the frontend production build. No live TEAMI synchronization or deployment is established by these tests.
