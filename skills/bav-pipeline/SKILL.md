---
name: bav-pipeline
description: "Full BAV (Business Analysis & Valuation) build for a public company: strategy analysis → SEC financial data assembly → condensed financials & DuPont decomposition → multi-scenario residual income valuation. Produces a coverage dossier (Obsidian-compatible markdown), a formula-driven Excel workbook, and an investment memo under coverage/{TICKER}/. Use when someone asks to analyze or value a stock, build a financial model, run a DCF or abnormal-earnings valuation, create a DuPont analysis, or start coverage on a new company. Also trigger on 'BAV pipeline', 'residual income', 'valuation model'. If coverage/{TICKER}/ already exists with assumptions.json, suggest the bav-update skill instead — this skill is for first builds and full rebuilds."
---

# BAV Pipeline — Orchestrator

You are orchestrating a 4-stage equity valuation pipeline. **Your job is coordination, not execution.** Each stage runs as a fresh subagent with a focused rubric; you handle the review gates between stages and keep the coverage vault consistent. This separation exists because stage quality degrades badly when one context tries to hold all four rubrics plus accumulated work product — do not inline the stages unless the Agent tool is unavailable.

## Architecture

```
STAGE 1  Strategist  → strategy_report.md + assumptions.json (input draft)
   ⏸ GATE A: scenario assumptions, probabilities, KPI watchlist
STAGE 2  Assembler   → workbook (IS/BS/CF tabs) + extraction_log.md
   (no gate — exceptions only: unresolvable conflicts, checksum failures)
STAGE 3  Analyst     → workbook += Condensed Financials, ALT DuPont
   ⏸ GATE B: ambiguous balance-sheet classifications only
STAGE 4  Modeler     → assumption_map.md, workbook += Model tabs + Scenario_Summary,
                       memo.md, results in assumptions.json
   ⏸ GATE C: final valuation sanity & terminal-return calibration
FINISH   Coverage    → dossier.md, journal.md, valuation_log.csv, _universe.md, history/
```

## File contract

All artifacts live in `coverage/{TICKER}/` under the project root (create it if missing). This directory doubles as an Obsidian vault — markdown files carry YAML frontmatter and standard relative links. Full schemas (dossier template, journal format, valuation log columns, canonical assumptions JSON) are in `references/coverage_schema.md` — read it before Stage 1 and follow it exactly.

```
coverage/
  _universe.md                     # index table across all covered tickers
  _conventions.md                  # analyst's standing conventions — READ FIRST, all stages
  {TICKER}/
    dossier.md                     # living thesis + KPI watchlist (frontmatter = dashboard fields)
    notes.md                       # analyst's free-form thinking — read at every touch
    strategy_report.md             # Stage 1 OUTPUT — model input, never contains model results
    assumptions.json               # canonical schema v2 — single source of truth
    assumption_map.md              # Stage 4 Step 0 — strategy element → vector element mapping
    {TICKER}_Integrated_Financials.xlsx
    memo.md                        # post-model investment memo (results live here)
    rationalization.md             # reverse-DCF: what must be true at the market price
    journal.md                     # dated log, reverse chronological
    pending_decisions.md           # persistent gate inbox for unattended runs (see references/automation.md)
    valuation_log.csv              # one row per model run
    history/                       # timestamped assumptions.json snapshots
    scripts/                       # the Python that built the workbook — MUST be persisted
```

## Running the stages

For each stage, spawn a subagent (Agent tool, `general-purpose`) whose prompt contains:
1. The **absolute path** to its rubric: `references/stage{N}_{name}.md` in this skill's directory (resolve to absolute before passing — the subagent cannot see this conversation).
2. The absolute paths of its input artifacts and where to write outputs.
3. Ticker, company name, today's date, and any user corrections from earlier gates.
4. The instruction: *"Read your rubric file completely before starting. Write all outputs to the specified paths. Return a compact summary: what you produced, key numbers, and a list of items needing human judgment (empty if none)."*

| Stage | Rubric | Reads | Writes |
|---|---|---|---|
| 1 Strategist | `references/stage1_strategist.md` | web research; latest 10-K narrative | strategy_report.md, assumptions.json (draft, no results) |
| 2 Assembler | `references/stage2_assembler.md` | SEC EDGAR via edgartools | workbook IS/BS/CF tabs (+ quarterly sections + Valuation Multiples), extraction_log.md, quarterly_extraction_log.md, scripts/build_statements.py + build_quarterly_sections.py + build_multiples.py |
| 3 Analyst | `references/stage3_analyst.md` + `references/xlsx_patterns.md` | workbook (+ non-recurring filings research) | workbook += Condensed Financials, ALT DuPont (each with quarterly sections), Core Earnings Bridge (IS foot), Earnings Quality tab; scripts/build_condensed.py + build_core_bridge.py + build_quality.py + nonrecurring_research.json |
| 4 Modeler | `references/stage4_modeler.md` + `references/xlsx_patterns.md` | strategy_report.md, assumptions.json, workbook | assumption_map.md, workbook += Model tabs + Price Rationalization (with the live ICC block) + Guidance & Consensus + per-tab enterprise-DCF blocks + Scenario_Summary analytics (terminal-returns/multiples/sensitivity); memo.md; results + scripts/icc.json into the vault; scripts/build_model.py + rationalize_price.py + build_guidance.py + the **post-model feature chain** (apply_model_extras, build_dcf, build_summary_extras, compute_icc, add_icc_block, rebuild_features) using `references/lib/` |

Stages run strictly in order — each consumes the previous stage's files. Do not parallelize. Relay each stage's "items needing judgment" at the next gate; if a stage returns failures, fix forward (re-spawn with the correction) rather than silently proceeding.

**Stage 4's analytics layer (the post-model feature chain).** Beyond the core Model tabs, Stage 4 builds an analytics layer that sits on top of them — the live implied-cost-of-capital block, the enterprise FCFF/WACC DCF cross-check, the Scenario_Summary terminal-returns/implied-multiples/sensitivity-heatmap sections, the terminal-growth linkage (B9==U11) and the historical-average column. Because re-running the model regenerates Model_\* + Scenario_Summary and drops downstream regions, this layer is re-applied by `scripts/rebuild_features.py` in a fixed order (`build_model → apply_model_extras → build_dcf → build_summary_extras → compute_icc → add_icc_block → validate`); the shared engine-agnostic math is in `references/lib/`. See `references/stage4_modeler.md` items 5–8 for the spec. `bav-update` re-runs this chain after registering any edit.

**Stage 1 and Stage 2 ordering note:** Stage 1 may run before Stage 2 (it uses web research and filing narrative, not the workbook). If the user already has a workbook or strategy report, skip the corresponding stage — detect what exists in `coverage/{TICKER}/` first.

## Review gates (main loop, AskUserQuestion)

Run gates interactively unless the user said `--auto` / "no questions" — in auto mode, apply the recommended defaults, log every decision to journal.md, and list them in memo.md under "Decisions made without review."

**GATE A — after Stage 1.** Show: the scenario differentiation matrix, the assumption summary table (Y1/terminal growth & margin per scenario, betas), probability weights, and the KPI watchlist with thresholds. Flag every number that is an estimate rather than sourced. Ask about: probability weights, any vector the user wants to adjust, and watchlist thresholds. Write confirmed values back into assumptions.json before Stage 2.

**GATE B — after Stage 3.** Show **only the ambiguous classifications** (operating leases, deferred taxes, pensions, short-term investments, equity-method investments — items the Analyst flagged with ⚠️), each with the default, the alternative, and the analytical implication (effect on NOA/RNOA/FLEV). Accept-all-defaults must be one click. Confirmed choices become the dropdown defaults.

**GATE C — after Stage 4.** Show the final table: IVPS per scenario + weighted, vs. current price; terminal RNOA, ROE, and RNOA/CoE ratio per scenario; calibration verdict (Bear 1.0–1.5×, Base 1.5–2.5×, Bull 2.5–3.5× CoE). If any scenario's terminal RNOA exceeds 5× CoE, do not present it as final — send it back to Stage 4 with instructions to raise asset-intensity vectors or compress margins, then re-gate. Ask whether to adjust and re-run or accept.

**Stage 2 has no gate.** Restatement conflicts auto-resolve newest-filing-wins (log each in extraction_log.md). Escalate to the user only on: checksum failure that survives re-extraction, a line item that cannot be sourced, or data gaps the superset schema can't paper over.

## Finishing a run

After Gate C acceptance, in this order:
1. Write `results` into assumptions.json and snapshot it to `history/{date}_assumptions.json`.
2. Append one row to valuation_log.csv.
3. Write/refresh dossier.md (frontmatter fields drive the universe dashboard — keep them accurate).
4. Append a journal.md entry: trigger, what was built, key numbers, gate decisions, open questions.
5. Update `coverage/_universe.md`.
6. Confirm `scripts/` contains the full runnable build chain (statements → condensed → quarterly_sections → core_bridge → quality → guidance → model, + multiples and rationalize_price) — bav-update depends on them, in that run order.
7. Tell the user: weighted IVPS vs. price in one sentence, where the files are, and that `/bav-update {TICKER}` is the maintenance path from here.

## Failure policy

Never silently default a missing value to zero, skip a checksum, or hardcode what should be a formula. If a stage cannot meet its rubric, it must say so in its summary and you must surface it — a smaller honest model beats a complete fabricated one.
