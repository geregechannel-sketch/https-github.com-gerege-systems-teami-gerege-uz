# One-shot TEAMI archive pull

`teamisource.Pull(ctx, endpoint, token, request)` now implements one source HTTP read. `PullAndStore` connects that read to the transactional archive store. Both are internal functions, not public HTTP endpoints. There is no timer, auto-login, executable deployment or production activation in this change.

The endpoint must explicitly end at /ec3api/v1/archives/point, with HTTP or HTTPS, no userinfo/query/fragment/encoded path. Only the single-measurement request and flags captured in the user HAR are accepted. The observed authentication header name is st-token; no captured header value was inspected, copied into source or replayed. A separately provisioned integration token is required. Browser login passwords are not equivalent to this token and must not be substituted.

The client performs POST with a 20-second timeout, refuses redirects, bounds decoded body reads to 16 MiB and validates the success envelope and source IDs. Authentication/server errors or invalid content stop the call with no import; response error bodies and credentials are not logged. It performs one attempt; a future scheduler must implement backoff/checkpoints and stop on authentication failure. It never invokes reading-from-device, relay or load-control routes.

A source simulator is used in tests, not a live authenticated TEAMI session. Tests cover the observed request/header shape, wrong endpoint rejection, missing credential rejection, redirect non-following, error-body redaction and HTTP pull-to-PostgreSQL replay without duplicate samples, followed by local API retrieval.

## Mapping investigation

On the authenticated production TOSH points screen, the name and code for the balance point match the captured TEAMI source: name Ул. Баялаг.ТП 43.Балансовый счётчик; code MN.Ул. Баялаг.ТП 43.Балансовый счётчик. Source POINT_ID is 1194453. The TOSH UI does not expose its internal ID, so target ID equality is not established. The HAR point row includes meter number 114250325315, but this was not independently matched to TOSH's mounting history. Source timezone was not established from captured usersettings or the public global settings. Display timezone and meter location cannot settle database timestamp semantics.

Before production: verify target IDs and parameter meaning, source timezone and mounting identity; provision an integration credential on the host; configure the one-shot caller, run a reviewed controlled pull, then enable monitored scheduling. No source timezone or target ID was guessed. No production API writes, DB migrations or device commands were made.
