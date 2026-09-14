# TEAMI source contract observed on 2026-09-14

Evidence: user-supplied 81-entry HAR and archive Excel export. Raw HAR, authentication headers, cookies and tokens are not copied into this repository or replayed. This is one user-browser capture, not proof of a scheduled source-to-TOSH pull.

## Observed read request

POST /ec3api/v1/archives/point returned HTTP 200 and success:true. Request:
```json
{"FROM":"2026-09-14","TO":"2026-09-14","POINT_ID":1194453,"ML_ID":[1044],"MD_ID":12,"AGGS_ID":13,"WO_BYP":0,"WO_ACTS":0,"BILLING_HOUR":0,"BILLING_HOUR_FOR_PREV_DAY":0,"SHOW_MAP_DATA":0,"FREEZED":1}
```
These flags are reproduced only as observed, not interpreted as guarantees about all server operations. The captured parameter selection used POST /parammenuv2/ml with POINT_ID:[1194453], GR_ID:[], EXTRACTBRANCHDATA:1, SCOPE:ARCHIVES, AGGS_TYPE_ID:2 and MSF_ID:13. ML 1044 is 15-minute average P+ power in kW. Source point IDs must be mapped explicitly to target IDs; no identity assumption is authorized.

## Response and Excel reconciliation

The envelope contains success, data and DB_TIME. It has 96 consecutive 15-minute intervals for the source calendar day. Excel has the same 96 interval values, including blanks, in the same order. 24 intervals from 00:00 to 06:00 have values; 72 from 06:00 to next midnight have VAL:null. This does not identify why data is absent, and future time is not automatically an outage.

First VAL: 8.46 kW. Valued intervals: minimum 6.36, maximum 24.3, average 12.045 kW. Raw arithmetic sum of power values is 289.08, not a billable energy total. Captured /measurelines/ml_convert supplies COEF:0.25 from input ML 1044 (kW average) to output ML 1040 (kWh interval sum). Applying that coefficient yields 72.27 kWh for these 24 intervals, numerically matching the UI's 72.270 sum. This is an energy conversion, not a monetary tariff calculation.

Fields include POINT_ID, ML_ID, ID, BT, ET, VAL, DR, DF, READ_TIME, HSS, DSS, SFS, HAS_ACT, TFF_ID and BYP_EXISTS. VAL is not VALUE. Do not mistake DR for the meter value. Valued rows have DSS:"1", SFS:"Нормальные данные", HSS:0 in this capture. Missing rows have null VAL/DSS/SFS and HSS:1. These observations are not a complete status-code dictionary. Keep raw flags.

BT, ET and READ_TIME have no timezone offset. Valued rows show READ_TIME 2026-09-14 11:58:10. It is unsafe to equate those source wall-clock strings to UTC or the operator browser's UTC+08 until source timezone configuration is verified. /tarifflists returns five labels/colors (including TFF_ID:0 Без тарифа), not currency rates, monetary charges or effective billing rules.

## Implementation

internal/teamisource builds the observed single-point request and decodes its response without network/authentication/DB side effects. It preserves decimal text, null values, source wall-clock timestamps and raw per-row metadata, validates point/ML consistency and rejects duplicate or invalid intervals. UTC conversion requires an explicit source timezone argument. Test fixtures use an anonymized point and a precision stress value; they are not production records.

This package is not yet wired to a scheduler or importer. The local archive API differs: scalar ML_ID, RFC3339 [FROM,TO), VALUE instead of VAL, and archive_samples.value NOT NULL. Do not insert 72 placeholder zeroes or discard source status. Missing intervals, read-time and tariff/provenance fields need explicit storage mapping. Verified authentication provisioning on the integration host, source timezone, point mapping, idempotent persistence, retry/recovery and end-to-end reconciliation remain required. No production changes were made.
