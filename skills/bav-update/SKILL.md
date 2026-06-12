---
name: bav-update
description: "Incremental update of an existing BAV coverage position when new information arrives: pulls filings/earnings since the last update, diffs actuals against the forecast, checks the KPI watchlist against its triggers, proposes assumption revisions, re-runs the valuation model, and appends to the ticker's journal and valuation log. Use when the user says a covered company reported earnings, asks to refresh/update a valuation or forecast, or wants to incorporate news into an existing model. Requires coverage/{TICKER}/ to exist — for a first build, use bav-pipeline instead."
---

# BAV Update — Incremental Coverage Maintenance

Update one ticker's running forecast and valuation in place. The point of this skill is the **learning loop**: compare what we forecast to what happened, revise with stated reasons, and leave an audit trail. Schemas for every file you touch are in `../bav-pipeline/references/coverage_schema.md` — read it first. Model mechanics, if you need to rebuild tabs, are in `../bav-pipeline/references/stage4_modeler.md` and `xlsx_patterns.md`.

If `coverage/{TICKER}/` doesn't exist, stop and offer bav-pipeline. If assumptions.json is legacy (no `schemaVersion`, or MSFT-style key names), snapshot the original to `history/` untouched, then migrate to schema v2 as part of this update — **interactive and `--auto` runs only; a `--prepare` run never migrates (it writes a pending decision recommending the migration instead, per the write-authority contract).**

## Procedure

### 1. Load state
**First: `coverage/{TICKER}/pending_decisions.md`** — if unattended runs left proposals, gate each entry now (AskUserQuestion), record the decision + rationale in the journal, and remove the entry (the `[pending since …]` marker is machine-parsed; entries must not linger after decision). Then read `coverage/_conventions.md`, dossier.md, assumptions.json, **notes.md** (the analyst's free-form thinking — flag entries newer than the last journal entry; they are input to this update and must be acknowledged in the journal), the last ~3 journal entries, and the valuation_log tail. Establish: last update date, current vectors and probabilities, watchlist rows, open questions. Note `next_catalyst` — it usually names the event you're now processing.

### 1b. Reconcile analyst edits (the learning loop)
The analyst edits workbooks directly. Before changing anything, read the workbook back and diff against the recorded state:
- **Classification column** vs. `_conventions.md` / the engine's CLASSIFICATION dict — a toggled cell is analyst feedback with gate-answer authority. Propose adopting it as a standing convention (or one-ticker exception), update `_conventions.md` and the engine script, and translate the affected ratio vectors into the new lens (shift by the moved items' ratio-to-sales; keep growth/margins unchanged; verify terminal RNOA bands still hold).
- **Layout/structural edits** — re-discover row positions by label (Excel auto-adjusts cross-tab references when rows are inserted/deleted, but model-tab anchors and rebuild scripts must be re-pointed).
- **Blue-cell input edits** (vectors, price) — Class A per the **write-authority contract in `coverage/_conventions.md`** (canonical; it supersedes anything else on this question): analyst-initiated edits auto-register with provenance "analyst direct edit" — the edit is the sign-off. The contract's exceptions (probability cells, scenario-ordering violations, implied new conventions) become pending decisions instead.
Record every adopted convention in the journal and in `_conventions.md` with date and rationale.

**Run modes** (full table in the write-authority contract): interactive (gates inline) · `--auto` (user-invoked: apply recommendations, log "(auto)") · `--prepare` (unattended/sentinel: perform steps 1–4 fully, register non-excepted Class A edits, but write every Class B proposal to `coverage/{TICKER}/pending_decisions.md` and notify instead of touching assumptions.json; see `../bav-pipeline/references/automation.md` for the headless execution contract).

### 2. Gather what's new (since last update date)
- **Filings:** edgartools (`Company(t).get_filings(form=["10-K","10-Q","8-K"])`, filter by date; identity string per stage2_assembler.md).
- **FACTS APPEND AUTOMATICALLY (any run mode, including unattended)** — as-filed financial data is fact, not judgment; it needs a checksum, not a gate. **Script run-order contract** (each rebuilds from scratch and drops downstream regions): `build_statements.py → build_condensed.py → build_quarterly_sections.py → build_core_bridge.py → build_quality.py → build_guidance.py → build_model.py` — always resume the chain from the first script you re-ran.
  - **New 10-Q** ⇒ re-run `scripts/build_quarterly_sections.py` (appends the quarter column to the quarterly sections in IS/BS/CF + quarterly Condensed/DuPont, per-quarter checksums blocking), then `build_core_bridge.py` (it sits below the quarterly section) and `build_quality.py` (new Benford column, quarterly scores). Scan the new 10-Q for new non-recurring items → propose additions to `nonrecurring_research.json` (the items are facts; their *inclusion default* is judgment — Class B note unless the analyst toggles).
  - **New item-2.02 8-K** ⇒ extract the outlook into `scripts/guidance_research.json` and re-run `build_guidance.py` (ledger row + fresh consensus snapshot, captured dated).
  - **New 10-K** ⇒ also re-run `scripts/build_multiples.py` ~30 days after the FY earnings release (the price-lag window must elapse) to append the year's multiples column; and re-run `scripts/build_statements.py` to EXTEND the annual source tabs with the new fiscal year (superset window slides; keep up to 10 years; extend `meta.dataYears`); then the full chain above (the quarterly window slides to anchor−1; a completed FY gains its derived Q4 column). The new anchor year itself — re-anchoring vectors, ratios, anchor revenue — IS judgment and goes through the gate (Class B in unattended runs). So is wiring the model's margin anchor to the bridge's CORE NOPAT MARGIN row.
  - **Weekly (no filing needed)** ⇒ `build_guidance.py --snapshot-only` appends a dated consensus snapshot (point-in-time ledger; never backfilled).
  - If Excel holds the workbook open, defer the append with a notification and retry next pass — never write into an open workbook.
- **Results & guidance:** web search the latest quarter — revenue, segment growth, margins, guidance changes.
- **Media sweep:** run the uncertainty-keyed sweep per `../bav-news/SKILL.md` — one targeted search per dossier key uncertainty and watchlist row plus one general pass, findings classified trigger-tripping / load-bearing / noise. (A standalone sweep without a model update is the bav-news skill itself.)
- **Market:** current price (with date), updated 10Y risk-free if it moved materially.

### 3. Forecast vs. actual (the core diff — skip only if no new financials)
Compare reported revenue growth and NOPAT margin against Year-1 of each scenario vector; segment growth against `segments[]`. State it plainly: "Base Y1 growth 13% vs. reported 14.2% — +1.2pp beat, tracking between Base and Bull." Quarterly data annualizes noisily — say so rather than overreacting to one quarter.

### 4. KPI watchlist check
Evaluate every row against fresh data. A tripped trigger REQUIRES either a proposed assumption/probability revision or an explicit journal rationale for standing pat. Update each row's `current`/`asOf`.

### 5. Propose revisions (gate)
Specific edits with provenance: which vector elements, which probabilities, which watchlist thresholds, and the evidence for each. Probability shifts are usually the right first response to evidence; wholesale vector rewrites belong to thesis changes. Present via AskUserQuestion — proposed revisions / no changes / user adjustments — unless `--auto`, in which case apply recommendations and mark the journal entry "(auto)". If nothing material changed, say so; **"no changes — here's why" is a valid, valuable update** and still gets a journal entry (and a valuation_log row only if the model was re-run, e.g. for a price refresh).

### 6. Apply
1. Snapshot assumptions.json → `history/{date}_assumptions.json`; write the new file (`meta.supersedes`, `meta.trigger` set).
2. Refresh the model: re-run `scripts/build_model.py` with the updated JSON. (Source-tab extension for a new 10-K and the quarterly-section/bridge/quality/guidance appends already happened in step 2 — facts are not gated.) If scripts/ is missing (legacy position), rebuild per the stage references and **persist the scripts this time**.
3. Recompute results into assumptions.json.

### 7. Record
- journal.md entry (top): trigger, forecast-vs-actual, watchlist results, changes + rationale, new valuation, open items.
- **Refresh the price rationalization** when price or assumptions moved materially: `python3 scripts/rationalize_price.py all --price <px>` (re-inverts the engine, regenerates the stories via the Claude API if a key is available, rewrites rationalization.md + the Price Rationalization tab). Story likelihoods vs. registered probabilities are tracked divergences, not errors — note material shifts in the journal.
- valuation_log.csv row.
- dossier.md: frontmatter (weighted_ivps, price, gap, last_update, next_catalyst, status: current), watchlist currents, valuation snapshot, thesis paragraph if it moved.
- `coverage/_universe.md` row.

### 8. Report
A compact update brief in chat: what happened, forecast vs. actual, what changed and why, old → new weighted IVPS vs. price, next catalyst. Lead with the conclusion ("Thesis intact; beat absorbed by raising Bull probability — weighted IVPS $166 → $181 vs. $310, still -42%").
