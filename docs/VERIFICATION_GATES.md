# Verification gates — 2026-09-14

## Live source
The current cloud browser returns 502 'The remote server does not speak TLS' for the provided TEAMI address. TOSH shows a login page; a previous session is not present. Neither observation proves an outage or successful synchronization. No source adapter endpoints or credentials were invented.

Automatic pull remains blocked on a verified read-only source contract, sample response, ID/unit/timezone mapping and a reachable authenticated connection. Acceptance requires a new source interval appearing once in the target, an identical retry producing no duplicate, recovery after interruption and visible last successful source timestamp. Local archive API tests alone do not satisfy this gate.

## Tariffs
The source tree's g_tarifflists has only an ID column; tariffplans and tariffplansperiods are virtual models. No rate, effective dates, currency, meter-register interpretation, multipliers or rounding policy is implemented. Generic tariff verification/grc_rule actions now return 501 rather than misleading success. A production calculation requires the applicable approved tariff rules and a matched source bill/reading example; no rates or charges were guessed.

## Audit preservation
Removed restart-time TRUNCATE and synthetic INSERT for audit_log, audit_files and user_sessions. Existing records are retained without being relabeled as verified; old generated records require separate provenance review. New databases have no fabricated entries in these tables.

Added database statement triggers rejecting UPDATE, DELETE and TRUNCATE for audit_log and audit_files. INSERT remains available for future trusted event writers. Session rows may need lifecycle updates and are not covered by these triggers; generic application writes remain blocked.

Tests assert empty fresh tables, preservation over repeated startup migrations, SQLSTATE 42501 for mutations and explicit unimplemented tariff responses. No production migration was run.

This is not complete audit security: actual event capture, runtime role separation, immutable external retention, privileged DBA tamper detection, backup restoration and per-point access are still unverified/unimplemented. A table owner or superuser can change/disable triggers. Other historical migrations still contain demo seeds and run on startup; deployment needs a broader migration/seed review. API credentials do not grant production database/host access.
