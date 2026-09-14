# Local archive read contract

This implements local archive reads, not an automatic TEAMI connection. No production data or credentials are included and no ingestion API is exposed yet.

`archive_samples` stores explicitly mapped point/ML/MD/AGGS, interval start/end, exact numeric value, unit, original status, source reference and receipt time. A future source adapter must verify source ID mapping and preserve provenance before loading data. There are no default readings. A database administrator can still write this table; provenance is not cryptographically verified.

GET measurementsarchives?POINT_ID=... lists combinations present in local samples. POST archives/point accepts POINT_ID, ML_ID, MD_ID, AGGS_ID, FROM and TO only. Timestamps require RFC3339 offsets; start-inclusive/end-exclusive interval-start selection is used. Intervals are returned intact, never prorated or aggregated. Results use UTC timestamps, numeric strings and unchanged source status. The UI chooses whole calendar dates in UTC+08:00 and converts the end date to the following midnight. Other archive actions still return 501.

Reads require reports or config privilege (wildcard admins included), consistent with existing global role privileges. Per-point user scopes are not implemented; do not claim tenant/point isolation. Maximum query span 366 days, 10000 returned rows, 20-second DB timeout. Oversized results fail explicitly rather than silently truncate. Parameters are limited to 1000 combinations. No tariff calculations, status interpretation, live collector or deployment is included.

Validation covers parameter isolation, period boundary, offset conversion, decimal precision, source status, empty result, invalid date and unauthenticated request. PostgreSQL CI is required before merge.
