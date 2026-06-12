# Unattended Execution Contract (headless runs, sentinel, cadence)

How BAV skills run without a human at the keyboard. The write-authority rules live canonically in `coverage/_conventions.md` → Write-authority contract; this file covers execution mechanics. The sentinel itself (what triggers runs) is a separate design — this contract is what any trigger must obey.

## Run modes recap

`--prepare` is the only mode permitted for unattended runs: full analysis (gather → forecast-vs-actual → watchlist), Class A registrations applied, **as-filed FACTS appended** per the script run-order contract (new 10-Q → quarter column in the quarterly sections below the annual blocks, then bridge/quality refresh; new earnings 8-K → Guidance & Consensus ledger row; weekly → dated consensus snapshot; new 10-K → annual source-tab extension + the full downstream chain — all checksummed, deferred-with-notification if the workbook is open in Excel), and every Class B revision written to `coverage/{TICKER}/pending_decisions.md` + notification — assumptions.json untouched by system proposals except recorded facts in `meta.dataYears`. `--auto` requires an explicit human invocation in that session or command.

## Permissions (the night-one failure mode)

An unattended `claude -p` that hits a permission prompt hangs or dies silently. Fix: a dedicated profile at `automation/headless_settings.json`, passed via `--settings` — NOT merged into project settings, so interactive sessions keep their prompts. The profile allows file tools, web research, `python3`, and `git add coverage/` — and **denies `git push`, `rm`, `git reset/checkout/rebase`**: the runner wrapper owns push; the model inside an unattended run cannot mutate git history or delete files.

## Concurrency (earnings cluster at scale)

All unattended work goes through `automation/bav_headless.py`:
- **One repo-level exclusive lock** (`coverage/_state/run.lock`, `fcntl.flock`, 3h wait ceiling) — tickers process **sequentially**; concurrent invocations queue on the lock. Shared files (`_universe.md`, `_conventions.md`, git index) never see interleaved writers.
- **Busy-repo guard:** mid-merge/rebase/index.lock ⇒ exit 2 (skipped) with notification, never run.
- **Exit-code contract (the sentinel depends on it):** `0` ran ok ⇒ pending work cleared · `2` skipped ⇒ pending survives · `1` failed ⇒ pending survives + notification. **Triggers are transactional**: the sentinel records detected work (new filings, analyst edits, due sweeps) in a durable pending queue and clears an item only on exit 0 — failures and cost-guard deferrals are never lost.
- **Git protocol:** commits scoped to `coverage/` only, one commit + push per runner invocation (an audit trail on one laptop disk is not an audit trail). Git failures notify, never crash. `coverage/_state/` is gitignored operational state.
- **Heartbeat:** owned by **sentinel.py** (written at the end of every pass, including quiet ones — it means "the cadence is alive", not "runs succeeded"). bav-brief MUST report heartbeat age.
- **Escalating nag:** pending decisions older than 7 days re-notify on every sentinel pass (sentinel's job, not the runner's).
- **Trust model, honestly:** the headless permission profile's deny rules are guardrails, not a security boundary (Bash+python3 can do anything). Real protections: vault-only data exposure, append-only pushed git history, runner-owned push.

## pending_decisions.md (per ticker — the persistent gate)

Replaces the session-bound AskUserQuestion for unattended runs. Append-only while pending; entries move to the journal when decided.

```markdown
## PD-2026-08-01-1 — Q2 2026 revision proposal   [pending since 2026-08-01]
**Source:** unattended bav-update --prepare (10-Q 0001234567-26-000071)
**Proposal:** Base growthVector Y1 10%→11.5%; Widgets watchlist current 14%→12%.
**Evidence:** revenue +11.9% vs Base Y1 10%; Widgets below the >20% bull trigger path.
**To decide:** run `/bav-update ACME` — the session loads this file first.
```

Interactive bav-update sessions read pending_decisions.md at step 1 (before anything else), gate each entry, and clear it to the journal with the decision and rationale.

**The `[pending since YYYY-MM-DD]` marker is machine-parsed** (sentinel nag + dashboard grep for exactly that pattern) — every entry MUST carry it verbatim in its heading line.

## The sentinel (implemented: `automation/sentinel.py`)

One deterministic daily pass (launchd `com.bav.sentinel`, 07:00; install via `bash automation/install.sh`). Per covered ticker (discovered from dossier frontmatter, which must carry `cik:`):
1. **EDGAR poll** (submissions feed, material forms 10-K/10-Q/8-K; accession-deduped, date-floored) → new filing ⇒ queue `/bav-update {T} --prepare`.
2. **Analyst-edit reconciliation** — workbook/notes mtime advanced since last pass ⇒ queue `--prepare` (registers Class A, proposes Class B).
3. **Weekly media sweep** — `/bav-news {T} --prepare` when the last sweep is ≥7 days old (skipped for `status: needs-rebuild` stubs).
4. **Monday brief**, **escalating nag** (pending ≥7d), **dashboard regeneration** (`coverage/dashboard.html` — read-only, self-flagging when stale), heartbeat.
Cost guard: max 6 headless runs per pass (updates before sweeps; remainder deferred to the next pass). All execution goes through `bav_headless.py` (lock/queue/commit/push). Debug: `python3 automation/sentinel.py --dry-run`.
