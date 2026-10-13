# One-Shot TEAMI Archive Sync

`/teamisync` is shipped in the backend image alongside `/server`. It reads an
explicit JSON plan and imports selected archive series through the observed
`POST /ec3api/v1/archives/point` source contract. It performs no device command,
automatic login, migration, schema reset or scheduled job.

Provision `TEAMI_ARCHIVE_ENDPOINT`, `TEAMI_TOKEN` and `DATABASE_URL` on the
integration host. Do not commit tokens or use a browser session as the integration
identity. Source endpoint must be exact, without credentials/query/fragment.

The plan uses these fields; every ID and timezone must be verified by the
integration operator. Example IDs are placeholders, not a production mapping:

```json
{
  "source_ref": "verified-teami-installation",
  "timezone": "Asia/Ulaanbaatar",
  "from": "2026-09-14",
  "to": "2026-09-14",
  "series": [
    {
      "source_point": 777, "source_ml": 1044,
      "source_md": 12, "source_agg": 13,
      "target_point": 45, "target_ml": 1044,
      "target_md": 12, "target_agg": 13,
      "unit": "kW"
    }
  ]
}
```

Dates follow the observed inclusive source calendar convention. `Local`, missing
timezone/unit, unknown fields, duplicate targets and invalid ranges are rejected.

```bash
go run ./cmd/teamisync -config /secure/teami-sync.json
# Or run the image's /teamisync executable with that file mounted read-only.
```

One JSON result is printed per committed series, with Inserted, Unchanged,
Missing and Receipt. Credentials and response bodies are not logged. Null values
are retained in the receipt, not replaced by zero. A conflicting correction rolls
back its series. Earlier completed series remain committed if a later series
fails; rerunning the same plan is idempotent. Production verification still needs
a real pull followed by reconciliation against TEAMI's matching point/day.
