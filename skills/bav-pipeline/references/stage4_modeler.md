# Stage 4 — The Modeler

Build the multi-scenario residual income (abnormal earnings) model: Model_Bull / Model_Base / Model_Bear tabs plus Scenario_Summary, write the post-model investment memo, and record results in assumptions.json. Persist code to `coverage/{TICKER}/scripts/build_model.py`.

You are an HBS finance professor: the numbers must be defensible, the scenarios must tell genuinely different stories, and every assumption must trace to the strategy report.

## Step 0 — Assumption Map (REQUIRED, before any code)

Read `strategy_report.md` and `assumptions.json`. Produce `assumption_map.md`: a table tracing every model input to its strategy source. **If you cannot fill a row from the strategy report, the gap goes to the orchestrator — do not invent a bridge.** This document is what makes the model an expression of the strategy rather than numbers that coexist with it.

```markdown
# {TICKER} Assumption Map — {date}

| Strategy element (verbatim or cited) | Model input | Value(s) |
|---|---|---|
| Bear H1: "low-cost entrant takes 20% of unit share by FY28 → Widgets −6% vs Base by Y3" | Bear growthVector Y1–3 | 5% / 4% / 3.5% |
| Model Inputs Summary: Base growth 10/9/8 | Base growthVector Y1–3 | 10% / 9% / 8% |
| CapEx guidance ~2× depreciation through FY27 | nolaRatioVector ramp (all scenarios) | 0.45 → 0.67 (Bear) |
| Watchlist: Widgets growth 14% (Q4 2025) | segments[Widgets].growthY1to3 | per scenario |
| Moat: NARROW-but-defensible | terminal RNOA targets | Bear 1.3× / Base 2.0× / Bull 3.0× CoE |

## Segment reconciliation (Y1–3)
Base Y1: Widgets 0.73×10% + Services 0.14×18% + Other 0.13×6% = 10.6% vs growthVector[0] = 10% → Δ 0.6pp ⚠ adjust
```

Checks performed here:
- **Segment blend**: share-weighted segment growth must match top-line growthVector Y1–3 within ±0.5pp per year. Outside tolerance → adjust (and say which you changed and why).
- **Differentiation**: Bull−Bear Y1 growth spread <5pp or implied IVPS spread likely <30% → flag at Gate C ("scenarios may be insufficiently differentiated") unless the report argues low uncertainty.
- **Internal consistency**: Bull margins never compress below Base; Bear growth never exceeds Base; beta Bear ≥ Base ≥ Bull; identical shares everywhere; terminal growth ≤4% and < CoE in every scenario.
- **Anchor consistency**: assumptions.json anchorRevenue vs. the workbook's latest-FY revenue — mismatch >1% means Stage 1's web-sourced figure disagrees with the 10-K; the workbook wins, update the JSON.

## Mean reversion & terminal return calibration (the most common failure)

Terminal RNOA must reflect a defensible competitive position, not extrapolated current profitability. RNOA ≡ NOPAT margin ÷ (NOWC/Sales + NOLA/Sales); the three levers are margin compression and the two asset-intensity ramps.

| Scenario | Terminal RNOA target | Meaning |
|---|---|---|
| Bull | 2.5–3.5× CoE | durable moat, narrowed by competition |
| Base | 1.5–2.5× CoE | moderate moat, meaningful compression from peak |
| Bear | 1.0–1.5× CoE | advantage largely competed away |

Calibration: pick target RNOA → set terminal margin from competitive analysis → required terminal NOA/Sales = margin ÷ RNOA → split into NOWC/Sales and NOLA/Sales → build smooth 10-year ramps from current ratios. Both intensity vectors **increase** over time. Verify year-10 rows 36–37 after building; >5× CoE anywhere = assumptions broken, recalibrate before presenting.

## Model tab layout (fixed rows; one tab per scenario)

Columns: A = labels (width 42); then one column per historical year (linked to source tabs); then 10 forecast columns (width 14). First forecast column = column after last historical. Freeze column A.

```
ROWS 1–8   MARKET DATA:  Beta, ERP, Rf hardcoded (blue); Row 5 Ke =B4+B3*B2 (NEVER hardcoded);
           Row 6 tax rate; Row 7 pre-tax CoD =AVERAGE('ALT DuPont' hist after-tax CoD);
           Row 8 after-tax =B7*(1-B6)
ROWS 10–17 ASSUMPTIONS (orange bg): Row 10 years — historical =YEAR('Income Statement'!{col}6),
           forecast =prev+1. Row 11 growth — hist calc'd ={col}31/{prev}31-1, forecast hardcoded
           from growthVector (blue). Row 12 NOPAT margin — hist ={col}32/{col}31, forecast from
           marginVector (blue). Row 14 NOWC/Sales, Row 15 NOLA/Sales — hist calc'd; first forecast
           calc'd from anchor; rest hardcoded from ratio vectors (blue). Row 17 leverage
           (Net Debt/Total Capital) — hist calc'd; forecast carries forward =prev17.
ROWS 19–28 BALANCE SHEET (beginning): Row 21 NOWC, Row 22 NOLA — historical and FIRST FORECAST
           link to 'Condensed Financials' (anchor = actual data); later forecasts ={col}14*{col}$31
           and ={col}15*{col}$31. Row 23 NOA =21+22. Row 26 Net Debt — links, then ={col}17*{col}23.
           Row 27 Equity ={col}23-{col}26 (residual). Row 28 Total Capital =26+27.
ROWS 30–37 INCOME STATEMENT: Row 31 Sales — hist linked, forecast ={prev}31*(1+{col}11).
           Row 32 NOPAT — hist linked to CF tab, forecast ={col}31*{col}12. Row 33 after-tax
           interest ={col}26*$B$8. Row 34 NI =32-33. Row 36 ROE ={col}34/{col}27,
           Row 37 RNOA ={col}32/{col}23 (yellow bg, bold — calibration readout).
ROWS 39–51 ABNORMAL EARNINGS (forecast cols only): Row 40 NI =34. Row 41 capital charge
           ={col}27*$B$5. Row 42 AE =40-41 (green). Row 43 FCFE =40+(prevEquity−equity) (green).
           Row 44 PV factor =1/(1+$B$5) then ={prev}44/(1+$B$5). Row 45 PV(AE) =42*44.
           Row 46 ΣPV(AE) =SUM(first:last 45) in first forecast col; LAST forecast col row 46
           holds terminal value =AE_last*(1+g)/($B$5−g). Row 47 TV(PV) ={last}46*{last}44.
           Row 48 BV equity ={first}27. Row 49 IV =48+47+46. Row 50 diluted shares (blue).
           Row 51 IVPS =49/50.
ROWS 55+   PROFESSOR'S STRATEGIC NOTES — growth rationale, margin & moat assessment,
           key risks, valuation context (each: bold label row + italic text row).
```

Formatting: hardcoded inputs blue #0000FF; assumptions block orange #FCE5CD; returns yellow #FFF2CC bold; AE/FCFE green #D9EAD3 bold; currency `#,##0`; rates `0.0%`. Full openpyxl patterns in `xlsx_patterns.md`.

## Professor's Notes — differentiated, not templated

Each scenario gets its own narrative in its tab (and summarized in Scenario_Summary): growth rationale, margin & moat assessment, key risks to monitor, valuation context. Write them from the assumption map — name the mechanisms ("Bear margins compress 27%→20% on TAC renegotiation plus AI serving costs"), never copy-paste across scenarios with adjusted numbers.

## Scenario_Summary tab

Columns: Metric | Bear | Base | Bull. Sections, all formula-linked to model tabs: valuation outputs (IVPS r51, IV r49, TV r47, ΣPV AE r46, BV r48); key assumptions (Y1/terminal growth & margin from rows 11–12, Ke, beta); terminal-year returns (rows 36–37); probability-weighted IVPS via SUMPRODUCT of editable probability cells (blue); current price (blue) and implied upside/downside; one-line note per scenario. This lists the rows `build_model` writes at first build; the post-model feature layer (`build_summary_extras`, output #7) **owns rows 18+** and supersedes the simple terminal-returns/calibration rows with its richer block — so neither downstream code nor the validator may treat those rows as a stable anchor (see *Validator vs. the feature layer* under the run-order section).

## Post-model outputs

1. **assumptions.json `results`**: per-scenario IVPS and terminal RNOA, weightedIVPS, gapVsPricePct, asOf.
2. **memo.md** — the post-model investment memo (this is where results live, never the strategy report): thesis-in-one-paragraph; valuation table vs. price; what the market must believe at the current price vs. what each scenario believes; calibration table (terminal RNOA/CoE per scenario); key sensitivities; the watchlist items most likely to move the valuation next; decisions made without review (auto mode only).
3. **Price rationalization** — build `scripts/rationalize_price.py` for the ticker (GOOGL's is the reference implementation): (a) invert the engine at the market price along four axes — implied probability mix, implied terminal RNOA/asset-lightness, implied growth CAGR, implied cost of equity; (b) generate the "what must be true" stories (each: narrative, exact parameter mapping, evidence for/against from the watchlist, likelihood %) via the Claude API (`claude-opus-4-8`, adaptive thinking, structured-output JSON schema; requires ANTHROPIC_API_KEY — author in-session as fallback); (c) render `rationalization.md` and the **Price Rationalization** workbook tab. The tab owns the current-price cell (blue, editable) — Scenario_Summary's price links to it. Stories must be grounded in the inversion numbers, never free-floating narrative.
4. **Guidance & Consensus tab** — build `scripts/build_guidance.py` (ledger-style tab, three blocks):
   - **Management guidance ledger**: every outlook from the item-2.02 8-K releases (EX-99 text → `scripts/guidance_research.json`, each row with given-date, accession, period, metric, basis GAAP/non-GAAP, low/mid/high, short evidence quote), joined to as-filed GAAP actuals by live formulas into the quarterly IS section, with actual-vs-mid and percentile-of-range — a management-credibility series. Companies without formal guidance (Alphabet) get the policy recorded plus any dated quantified forward statements (capex outlooks).
   - **Consensus snapshots**: free-source estimates (yfinance) captured **dated at every run and appended to `scripts/consensus_snapshots.json` — never backfilled or revised**. Free data has no as-of-date archive; this ledger IS the archive, so it only grows. Snapshot = revenue/EPS avg-low-high + analyst counts per period (0q/+1q/0y/+1y mapped to fiscal labels), price target mean/high/low, price.
   - **Translation to RIM parameters**: OURS (live links into Model_Base — revenue Y1/Y2, growth, EPS, NI, NOPAT margin) vs STREET (newest snapshot) vs GUIDE (newest outlook) with deltas, via a documented bridge (street NI = street EPS × model diluted shares; street NOPAT ≈ NI + model after-tax net interest). The delta column is *where we disagree with the street in our own model's units* — feed the big ones to the memo.
   Class: facts + display — street snapshots and guides are facts; OURS cells are live model links; no judgment is written by this script.
5. **Model-tab extras** — `scripts/apply_model_extras.py` (uses `references/lib/model_extras.py`): set each Model tab's terminal-growth cell **`B9 = =U11`** (terminal g LINKED to the terminal-year revenue growth, never a hardcoded literal; the terminal-value formula references `$B$9`), and add a **Historical-Average column (W)** = `AVERAGE(C:K)` for revenue growth (row 11), NOPAT margin (12), NOWC/Sales (14), NOLA/Sales (15), **ROE (36), RNOA (37)** — the forecast vectors read against the as-filed historical norm. Idempotent; never touches the forecast vectors.
6. **Enterprise DCF (FCFF / WACC) cross-check** — `scripts/build_dcf.py`: beneath each Model tab's equity (residual-income) valuation, the firm-side mirror on the SAME forecast — FCFF = NOPAT − ΔNet Operating Assets; EV = Σ FCFF/(1+WACC)^t + Gordon terminal (terminal g references `B9`); Equity = EV − net debt; reconciled against the equity-side IVPS. A material gap localizes to the **market value of net debt** or the **WACC** — the standard two-method diagnostic. WACC = wE·Ke + wD·Kd(after-tax), market-value weights; net-debt MV is an editable blue input defaulting to book (`marketData.netDebtMarketValue` slot); net-cash firms carry a negative debt weight. (An inherent ~1–2% RIM-vs-WACC convention residual exists — treat only materially larger gaps as a signal.)
7. **Scenario_Summary analytics** — `scripts/build_summary_extras.py` (owns the tab below the market-comparison block; leaves the validator-pinned rows 1–16 intact): **terminal returns vs hurdles & history** (terminal RNOA vs WACC and vs the latest historical RNOA; terminal ROE vs cost of equity and vs historical ROE); **implied multiples** (forward P/E = IVPS ÷ next-year EPS; terminal multiple = terminal value *as of year 10* ÷ first-terminal-year earnings, both referencing the terminal-growth cell); the **enterprise-DCF cross-check** row; and two reactive **2-D sensitivity grids** (`references/lib/sensitivity.py`) — IVPS vs Ke×terminal-growth and Ke×terminal-margin, centered on Base, with a red-yellow-green heatmap (red below baseline, green above). Axes chosen by sensitivity: a terminal-heavy RIM is most sensitive to Ke, then terminal profitability; terminal growth is muted (the terminal is *abnormal* earnings, not free cash flow).
8. **Implied cost of capital (live ICC block)** — `scripts/compute_icc.py` (headless `icc.json`) + `scripts/add_icc_block.py` (live block on the Price Rationalization tab, via `references/lib/icc.build_reactive_block`). ICC = the discount rate at which a scenario's IVPS equals the price of record (the inverse of the valuation = the price-implied expected return). The workbook block is **fully formula-driven and reactive, no macros**: since the operating forecast (NI, beginning equity) is independent of the discount rate, IVPS(r) is tabulated on a fine descending-rate grid (compact `SUMPRODUCT`) and the ICC is *interpolated* where the curve crosses the price cell — recomputing when the price or any model assumption changes. Expected excess (weighted ICC − Ke) is the cross-position ranking statistic; a non-monotone scenario hull (Base > Bull) suppresses the rank and flags "scenario set malformed."

### The post-model feature chain (run-order)
Items 5–8 are an analytics layer ON TOP of the core Model tabs. Because re-running the model **regenerates Model_\* + Scenario_Summary from scratch and drops downstream regions**, the layer must be re-applied after every model rebuild — `scripts/rebuild_features.py` runs it in order:

> `build_model (build/run) → apply_model_extras → build_dcf → build_summary_extras → compute_icc → add_icc_block → validate`

All steps are idempotent and never touch the forecast vectors. The shared, engine-agnostic math lives in **`references/lib/`** (`icc.py`, `model_extras.py`, `sensitivity.py`) — copy it to `coverage/_lib/` on a build; the per-ticker scripts supply only the engine closure and workbook paths. `bav-update` invokes `rebuild_features.py` automatically after registering an edit; a first build runs it as the final Stage-4 step.

**Validator vs. the feature layer (a hard-won invariant).** The model validator and `build_summary_extras` both touch Scenario_Summary, so they must not collide. `build_summary_extras` **owns rows 18+** — it clears and rewrites them every run, replacing the simple calibration row that `build_model`'s own build writes there (e.g. the terminal-RNOA/CoE ratio) with its richer terminal-returns block. A validator that pins that Scenario_Summary *display* row passes at first build but then **fails on every subsequent run** once `rebuild_features` (hence `build_summary_extras`) has executed — `validate` runs last in the chain, so it sees the overwritten cell. The rule: **pin invariants to SOURCE cells, never to a display cell a later pass owns.** Check the terminal RNOA/CoE engine-tie against the model-tab source cells — terminal RNOA at `Model_*!U37` and Ke at `Model_*!B5` (i.e. `U37/B5` per scenario), the same invariant decoupled from the Scenario_Summary layout. Pin only the rows the feature layer leaves intact (1–16); never anchor on a row the post-model layer regenerates.

## Return to orchestrator
The Gate C package: IVPS per scenario + weighted vs. price; terminal RNOA / ROE / RNOA-per-CoE per scenario with calibration verdicts; differentiation check result; segment reconciliation result; unresolved assumption-map gaps.
