# Dashboard performance measurement

The dashboard summary route currently executes one aggregate SQL query and
returns only counts. The mobile dashboard loads a separate, paginated task list
of at most 50 rows. These code facts are not a performance measurement.

`backend/scripts/benchmarkDashboard.js` records an `EXPLAIN ANALYZE` database
execution time and 50 (configurable) authenticated HTTP request samples after
five warmups. It refuses to report a result unless the selected account has at
least 1,000 tasks, so an empty test database cannot be reported as acceptance.
The result includes API p50/p95 and the three-second p95 check. Request timing
includes client/server network time; SQL timing is separately reported. The
summary endpoint source contains one database query per request.

Run only against an approved non-production dataset. Do not seed or benchmark
production without explicit approval. From `backend`, configure
`DASHBOARD_BASE_URL`, `DASHBOARD_ACCESS_TOKEN`, and `DASHBOARD_USER_ID` in the
process environment, then run:

```powershell
$env:DASHBOARD_BASE_URL = "http://localhost:3000"
$env:DASHBOARD_ACCESS_TOKEN = "<test-session-token>"
$env:DASHBOARD_USER_ID = "<test-user-id>"
$env:DASHBOARD_RUNS = "50"
node scripts/benchmarkDashboard.js
```

The project must still record a representative physical Android run for mobile
render completion and mobile request timing. No before/after or three-second
result is claimed until these measurements are run with a documented backend,
database, device, network, and dataset.
