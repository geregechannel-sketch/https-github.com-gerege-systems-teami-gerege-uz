# All-window preview

The preview routes every distinct MENU/DICTS leaf to a rendered window. `/windows` is a searchable catalogue and the loopback launcher's landing page. The dashboard uses captured headline values. `/archives` opens the real recorded archive instead of synthetic DEMO data; synthetic demonstrations are explicitly separated under `/demo/`. `/m/points` shows the previously captured 87-point catalogue.

An explicit field allowlist extracts 17 source response tables from the supplied HAR files. Selection is by latest captured request timestamp for each path, not by maximum row count. Each grid displays its capture time and branch/request scope; empty replies are distinguished from missing captures. User settings, query SQL, headers, cookies and credentials are excluded. Group rows exclude user identity fields. No requests are replayed.

All captured response tables can be inspected under `/evidence`, including field definitions and reference types that are not module result data. Generic windows have search, pagination, full row details and scrollable tables. Missing audit/report/billing results remain explicitly unverified; these are usable evidence review windows, not newly implemented production operations.

The banner collapses explanatory text, the catalogue adapts to viewport width and tables/detail panels scroll. Server-rendered tests cover every catalogue link and generic menu route plus distinction between 30 measure-line sets, 21 meter types, empty signals and missing audit results. TypeScript and standalone build are checked. Full browser visual/interaction validation remains unavailable in this environment.
