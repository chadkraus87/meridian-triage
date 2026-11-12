---
id: KB-025
title: Known issue: CSV export times out for large workspaces
area: platform
tags: known issue, csv export, export timeout, export_timeout, large export, download
---
This is a known issue. Engineering is already working on it.

## What is affected

CSV exports from the dashboard over about 200,000 rows time out. Smaller exports work normally. This mostly affects large workspaces exporting a long date range.

## What you see

- The export spins for a long time, then fails.
- The dashboard shows the error `EXPORT_TIMEOUT`.
- No file is downloaded, or the download link never appears.

Your data is not affected. The export fails, but nothing in your workspace is changed or removed.

## Workarounds

**Option 1: Export in parts.**

1. In the export dialog, filter by date range.
2. Pick a range small enough to stay under about 200,000 rows (for example one month at a time).
3. Repeat for each range and combine the files.

**Option 2: Use the async exports API.**

Use `GET /v2/exports` to run large exports in the background. Async exports don't have the dashboard timeout.

1. Start an export through the API for the data you need.
2. Check the export with `GET /v2/exports` until it shows as complete.
3. Download the file from the link in the response.

The exports API needs an API key with the `read` scope (see KB-006).

## Is this the issue you are seeing?

If the export fails with a different error, or fails for fewer than 200,000 rows, it may be a different problem. Contact support with your account ID (from Settings > Account), the exact error text, the approximate row count or date range, and the time of the failed export.
