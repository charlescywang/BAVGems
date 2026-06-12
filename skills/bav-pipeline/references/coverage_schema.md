# Coverage Vault Schema

The `coverage/` directory is the persistent knowledge base for all covered tickers. It is an Obsidian-compatible vault: every markdown file uses YAML frontmatter and standard relative links (`[GOOGL](GOOGL/dossier.md)`), which render in Obsidian, GitHub, and any editor. Git provides revision history; do not build a separate versioning scheme beyond `history/` snapshots.

Rules that keep the vault trustworthy:
- **assumptions.json is the single source of truth** for model inputs. The dossier and memo describe it; they never contradict it.
- **`_conventions.md` (vault root) carries the analyst's standing conventions** — classification calls, tab layout, modeling rules. Every skill reads it before building or updating. When the analyst's direct workbook edits diverge from it, that divergence is feedback: propose adopting it (gate), update the file, and mirror it into the ticker's engine script.
- **`{TICKER}/notes.md` is the analyst's free-form thinking channel.** Read new entries at every update; incorporate and acknowledge them in the journal. Claude may append clearly-attributed responses, but the file belongs to the analyst.
- **Never silently overwrite analyst edits in workbooks** — read classification toggles and layout back before any rebuild. Authority is defined ONCE, in `coverage/_conventions.md` → **Write-authority contract** (Class A analyst-initiated auto-registers with carve-outs; Class B system-initiated proposes by default) — skills cite it, never restate it.
- **strategy_report.md is a model INPUT.** It must never contain model outputs (IVPS, terminal RNOA). Results belong in memo.md and the dossier. If you find results in a strategy report, that's a defect — fix the separation.
- **Every assumptions.json revision gets a history snapshot first.** Never overwrite without snapshotting.
- **Raw filings are not stored.** EDGAR is the archive; the vault holds distilled knowledge plus the workbook.
- **Convert relative dates to absolute** ("next quarter" → "Q3 2026 (Oct 2026)").

## dossier.md

The living thesis. Rewritten in place as understanding evolves (git keeps history); the journal records *what changed when*.

```markdown
---
ticker: ACME              # all numbers below are fictional (the repo's sample company)
cik: 1234567              # REQUIRED — the sentinel's EDGAR poll keys off this
company: ACME Industrial Corp.
last_news_sweep: 2026-06-11   # stamped by bav-news; sentinel reconciles with its own state
weighted_ivps: 31.20
price_at_update: 45.00
price_date: 2026-03-08
gap_pct: -30.7
probabilities: 25/50/25
last_update: 2026-03-08
last_full_rebuild: 2026-03-08
fy_end: December 31
next_catalyst: "Q2 2026 earnings (~late Jul 2026)"
status: current          # current | stale (>90d or earnings since last_update) | needs-rebuild
tags: [coverage]
---

# {Company} ({TICKER}) — Coverage Dossier

## Thesis
One paragraph: what the market believes, what our model implies, where the difference comes from.

## Business model snapshot
Segments with revenue share and growth; unit economics; where margin is captured.

## Moat assessment: WIDE / NARROW / ERODING
Evidence bullets. Per-scenario interpretation (Bull: strengthens because… / Bear: erodes because…).

## Key uncertainties → scenarios
The 3–4 swing factors, each with its Bear/Base/Bull resolution. These must match the
scenario narratives in assumptions.json.

## KPI watchlist
| Metric | Current | As of | Bear trigger | Bull trigger | Linked assumption | Source |
|---|---|---|---|---|---|---|
| Widgets segment growth YoY | 14% | Q4 2025 | <6% two consecutive qtrs | >20% sustained | Base growthVector Y1–3 | 10-Q segment note |

This table is the monitoring contract: bav-update checks every row against fresh data
and a tripped trigger REQUIRES either an assumption revision or a journal entry
explaining why not.

## Current valuation snapshot
| | Bear | Base | Bull | Weighted |
|---|---|---|---|---|
| IVPS | $14 | $31 | $52 | $31 |
| vs. price ($45) | -69% | -31% | +16% | -31% |
| Terminal RNOA / CoE | 1.3× | 2.0× | 3.0× | — |

## Open questions
Things we could not resolve; what evidence would settle each.

## Files
[Strategy report](strategy_report.md) · [Assumption map](assumption_map.md) ·
[Memo](memo.md) · [Journal](journal.md) · [Valuation log](valuation_log.csv) ·
Workbook: {TICKER}_Integrated_Financials.xlsx
```

## journal.md

Reverse chronological, append at top. Entry format:

```markdown
## 2026-06-10 — Q1 2026 earnings update
**Trigger:** 10-Q filed 2026-04-29 + earnings call.
**Forecast vs. actual:** Base Y1 revenue growth 13% vs. reported 14.2% (+1.2pp beat);
NOPAT margin 17% vs. 18.1% actual. Widgets growth 16% — between Base and Bull.
**Watchlist:** no triggers tripped; order backlog ↑ to $4.2B (supportive).
**Changes:** Base growthVector Y1 13%→14%; Bull probability 25%→30%, Bear 25%→20%.
Rationale: …
**New valuation:** weighted IVPS $31 → $34 (price $46, gap −26%).
**Open:** tariff-exemption ruling on imported subassemblies expected Sep 2026.
```

Every entry needs: trigger, forecast-vs-actual (when new financials exist), watchlist
check result, what changed in assumptions.json and why (or "no changes — rationale"),
resulting valuation, new open items.

## valuation_log.csv

One row per model run. Append-only; never edit prior rows.

```csv
date,trigger,price,bear_ivps,base_ivps,bull_ivps,weighted_ivps,gap_vs_price_pct,prob_bear,prob_base,prob_bull,notes
2026-03-08,initial_build,45.00,14.10,31.40,52.30,31.20,-30.7,0.25,0.50,0.25,FY2021-25 10-K data; first full run
```

`trigger` ∈ initial_build | full_rebuild | earnings_update | thesis_change | manual.
`gap_vs_price_pct` = (weighted_ivps − price) / price × 100, one decimal.

## rationalization.md + the 'Price Rationalization' workbook tab

The reverse-DCF artifact: what must be true at the current market price. Produced by the
ticker's `scripts/rationalize_price.py` (see stage4_modeler.md → Post-model outputs):
engine inversions (implied probability mix, terminal RNOA, growth CAGR, cost of equity)
plus Claude-generated stories — each with a quantified "what must be true", an exact
model-parameter mapping, evidence from the watchlist, and a likelihood %. The workbook
tab **owns the current-price cell** (blue, editable; Scenario_Summary links to it).
Story likelihoods may diverge from the registered scenario probabilities — that
divergence is signal (system view vs. analyst view) and gets tracked in the journal,
not silently reconciled. Refresh at every bav-update where price or assumptions moved.

## scripts/ — persisted builders and their data files

Per-ticker scripts are the re-runnable build chain. **Run-order contract** (each
rebuilds its own regions from scratch and drops downstream ones):
`build_statements.py → build_condensed.py → build_quarterly_sections.py →
build_core_bridge.py → build_quality.py → build_guidance.py → build_model.py` —
always resume from the first script re-run. Data files that live beside them:

- `rowmap.json` — the workbook geometry contract every script reads/extends.
- `nonrecurring_research.json` — researched non-recurring items (per-item source,
  evidence quote, amount_confidence, default_include) feeding the Core Earnings
  Bridge. Items are facts; inclusion defaults are judgment.
- `guidance_research.json` — management outlooks extracted from item-2.02 8-K
  EX-99 text (given-date, period, metric, basis, low/mid/high, evidence).
- `consensus_snapshots.json` — **append-only point-in-time ledger** of dated
  consensus snapshots (free sources have no as-of archive; this file IS the
  archive). Same-date re-runs may replace that date's snapshot; never backfill.
- `quarterly_extraction_log.md` (ticker root) — quarterly-section provenance:
  quarter ↔ accession table, checksum counts, granularity folds.

## history/

Before any write to assumptions.json (after the initial build), copy the current file to
`history/{YYYY-MM-DD}_assumptions.json`. If two snapshots land on one day, suffix `_2`.

## _universe.md (vault root)

```markdown
# Coverage Universe
Updated: 2026-06-10

| Ticker | Company | Weighted IVPS | Price (as of) | Gap | P(Bear/Base/Bull) | Last update | Status |
|---|---|---|---|---|---|---|---|
| [ACME](ACME/dossier.md) | ACME Industrial | $31.20 | $45.00 (2026-03-08) | -31% | 25/50/25 | 2026-03-08 | stale |
```

Keep rows sorted by gap (most undervalued first). Status mirrors dossier frontmatter.

## assumptions.json — canonical schema v2

Additive changes only; bump schemaVersion on breaking changes. Migrate v1 files
(missing schemaVersion, or MSFT-style `revenueGrowthVector` keys) to this shape on
first touch, snapshotting the original to history/ unchanged.

```json
{
  "schemaVersion": 2,
  "ticker": "ACME",
  "company": "ACME Industrial Corp.",
  "meta": {
    "analysisDate": "2026-03-08",
    "trigger": "initial_build",
    "supersedes": null,
    "anchorFY": "FY2025",
    "anchorFYEnd": "2025-12-31",
    "anchorRevenue": 8400,
    "currency": "USD millions",
    "fiscalYearEnd": "December 31",
    "dataYears": ["FY2021", "FY2022", "FY2023", "FY2024", "FY2025"]
  },
  "marketData": {
    "price": 45.0,
    "priceDate": "2026-03-08",
    "dilutedShares": 410,
    "riskFreeRate": 0.042,
    "equityRiskPremium": 0.05
  },
  "segments": [
    {
      "name": "Widgets",
      "shareOfRevenue": 0.73,
      "growthY1to3": { "Bear": [0.04, 0.03, 0.03], "Base": [0.10, 0.09, 0.08], "Bull": [0.14, 0.13, 0.12] },
      "rationale": "Core segment ~57% of profit; a low-cost entrant's share capture vs. premium-mix defense is the swing."
    }
  ],
  "kpiWatchlist": [
    {
      "metric": "Widgets segment revenue growth (YoY)",
      "current": "14%",
      "asOf": "Q4 2025",
      "bearTrigger": "<6% for 2 consecutive quarters",
      "bullTrigger": ">20% sustained",
      "linkedAssumption": "growthVector Y1-3 (all scenarios)",
      "source": "10-Q segment disclosure"
    }
  ],
  "scenarios": {
    "Bear": {
      "probability": 0.25,
      "narrative": "Low-cost entrant compresses pricing; the capacity expansion fails to earn its cost of capital",
      "beta": 1.15,
      "costOfEquity": 0.0995,
      "taxRate": 0.21,
      "terminalGrowth": 0.03,
      "growthVector":    [0.05, 0.04, 0.035, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
      "marginVector":    [0.14, 0.135, 0.13, 0.125, 0.12, 0.115, 0.11, 0.105, 0.10, 0.10],
      "nowcRatioVector": [0.06, 0.07, 0.08, 0.08, 0.09, 0.09, 0.10, 0.10, 0.10, 0.10],
      "nolaRatioVector": [0.45, 0.50, 0.55, 0.60, 0.62, 0.64, 0.66, 0.66, 0.66, 0.67],
      "targetTerminalRNOAxCoE": 1.3,
      "provenance": {
        "growthVector": "Y1-3 from segment build-up (Widgets +4% on share loss per Bear H1, Services +8% per Bear H2); fade to 3% terminal ≈ nominal GDP.",
        "marginVector": "Compression from 16% to 10%: entrant pricing pressure without offsetting cost downs.",
        "nowcRatioVector": "Receivables terms lengthen as channel power shifts; ramps to 0.10 at maturity.",
        "nolaRatioVector": "Capacity build capitalizes into NOLA without proportional revenue; ramp forces terminal RNOA toward 1.3× CoE."
      }
    },
    "Base": { "comment": "same shape as Bear" },
    "Bull": { "comment": "same shape as Bear" }
  },
  "results": {
    "asOf": "2026-03-08",
    "Bear": { "ivps": 14.10, "terminalRNOA": 0.13 },
    "Base": { "ivps": 31.40, "terminalRNOA": 0.189 },
    "Bull": { "ivps": 52.30, "terminalRNOA": 0.271 },
    "weightedIVPS": 31.20,
    "gapVsPricePct": -30.7
  }
}
```

Field rules:
- All four vectors are exactly 10 elements; decimals not percentages.
- `dataYears` targets **up to 10 fiscal years** (as available for younger filers) and extends automatically when a new 10-K lands — as-filed data is fact, not judgment (see _conventions.md → facts clause).
- `provenance` is REQUIRED for every vector of every scenario — one or two sentences tracing the numbers to a strategy-report element. "Analyst judgment" alone is not provenance.
- `segments` growth must reconcile to the top-line `growthVector` for Y1–3 within ±0.5pp when blended by `shareOfRevenue` (Stage 4 checks this).
- `results` is written only by Stage 4 / bav-update after a model run; Stage 1 leaves it null.
- Stage 1 drafts this file; gates and updates revise it; nothing else writes to it.
