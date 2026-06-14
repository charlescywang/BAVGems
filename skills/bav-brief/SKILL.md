---
name: bav-brief
description: "Read-only status brief over the BAV coverage universe: current valuations vs. price, stale positions, KPI watchlist breaches, and upcoming catalysts — across all covered tickers or a deep brief on one. Use when the user asks 'where do we stand', 'status of my coverage', 'brief me on {TICKER}', or wants a portfolio summary of running forecasts and valuations. Never modifies any files; suggest bav-update for refreshes."
---

# BAV Brief — Coverage Status (read-only)

Report on the state of `coverage/` without changing anything. File formats are defined in `../bav-pipeline/references/coverage_schema.md`.

## Universe brief (no ticker given)

1. Read `coverage/_universe.md` and every `{TICKER}/dossier.md` frontmatter; pull each `valuation_log.csv` tail for trajectory (how the weighted IVPS and gap have moved over the last few runs).
2. Compute staleness honestly against today's date: `last_update` > 90 days ⇒ stale; a known earnings date or `next_catalyst` in the past ⇒ "events pending" even if < 90 days. Do not web-search every name by default — flag from the data on disk; offer a live check if the user wants it.
3. **Automation liveness:** report the age of `coverage/_state/heartbeat` (a stale heartbeat means the unattended cadence is dead — say so loudly) and the count + max age of entries in each ticker's `pending_decisions.md` (anything >7 days old is a red flag line of its own).
4. Output, in order:
   - **The table:** ticker, weighted IVPS, price (with its as-of date — stale prices mislead, label them), gap, probabilities, last update, status.
   - **Needs attention:** stale positions, pending catalysts, watchlist rows whose last recorded check tripped or neared a trigger, open questions that have aged.
   - **Suggested actions:** which `/bav-update {TICKER}` runs to do first and why.

A position with `status: needs-rebuild` or missing artifacts (no assumptions.json, no scripts/) should be called out as such — recommend `/bav-pipeline {TICKER}` rather than pretending the position is merely stale.

## Single-ticker brief (`bav-brief GOOGL`)

Read the dossier in full, the last 3 journal entries, the valuation log, and memo.md if present. Deliver:
1. **Stance in one paragraph** — thesis, weighted IVPS vs. price (dated), and how conviction has trended.
2. **Valuation trajectory** — the log as a short table; call out any large jumps and the journal's stated reason for each.
3. **Watchlist state** — each KPI vs. its triggers as of the last update.
4. **What would change our mind** — the dossier's uncertainties and open questions, plus the next catalyst.
5. **Freshness** — when last updated, what's happened since (from `next_catalyst` and dates alone), and whether an update is warranted.

If asked something the files can't answer ("did they beat last night?"), say the vault is as-of its last update and offer to run bav-update rather than answering from general knowledge.
