# Workbook Implementation Patterns (openpyxl)

## The one architectural rule

**Only Stage 2's source tabs (Income Statement, Balance Sheet, Cash Flow Statement) contain hardcoded financial values.** Every downstream tab is Excel formulas linking back:

```
IS / BS / CF (hardcoded) ─► Condensed Financials ─► ALT DuPont
                                   │
                                   └─► Model_Bull/Base/Bear (anchor cols link to CF tab)
                                              └─► Scenario_Summary
```

This buys auditability (click any cell, trace to source), live updates (correct a source value, everything recomputes), and the interactive classification system. Hardcoding a derived value anywhere is a defect. The only non-formula cells outside Stage 2 are *assumption inputs* (beta, Rf, ERP, tax rate, forecast vectors, shares, probabilities, current price), which are hardcoded **and styled blue** so users know what they may edit.

## Build process per tab

1. **Discover** the source tab's row layout — find rows by label match, never assume positions.
2. **Map** `{label: (tab, row)}` for every value you'll reference.
3. **Write formulas** as strings from the map.
4. **Export the row map** to `coverage/{TICKER}/scripts/rowmap.json` (merge keys across stages) — downstream stages and bav-update rebuild references from it instead of re-discovering.
5. **Validate** — recompute key outputs in Python from raw data and compare to what the formulas should produce (openpyxl does not evaluate formulas; a written workbook has no cached values until opened in Excel/LibreOffice). **Pin invariants to SOURCE cells, never to a display cell a later pass owns.** If an idempotent post-model pass regenerates a region (e.g. `build_summary_extras` rewrites Scenario_Summary rows 18+), a validator anchored on a cell in that region passes at first build but fails after the next rebuild. Validate the underlying invariant against the upstream source — e.g. the terminal RNOA/CoE engine-tie against `Model_*!U37` (terminal RNOA) and `Model_*!B5` (Ke), not against a Scenario_Summary calibration row the feature layer overwrites.

## Formula patterns

```python
# Cross-tab link (quote tab names with spaces)
ws[f'{col}{r}'] = f"='Income Statement'!{src_col}{src_row}"

# Derived within tab
ws[f'{col}{nopat_r}'] = f'={col}{ni_r}+{col}{niat_r}'

# Classification-driven aggregation (Stage 3; class col sits right of the year cols)
ws[f'{col}{r}'] = f'=SUMIF($G${t0}:$G${t1},"Operating Working Capital Asset",{col}${t0}:{col}${t1})'

# Average over prior year (DuPont)
ws[f'{col}{r}'] = f"=('Condensed Financials'!{col}{noa_r}+'Condensed Financials'!{prev_col}{noa_r})/2"

# Cross-check cell
ws[f'{col}{r}'] = f'=IF(ABS({col}{noa_r}-{col}{tc_r})<1,"OK","CHECK")'

# Probability weighting (Scenario_Summary)
ws[f'E{r}'] = f'=SUMPRODUCT(B{p_r}:D{p_r},B{v_r}:D{v_r})'
```

## Dates and headers

Source-tab column headers are `datetime.date` fiscal year-end objects with number format `"MMM DD, YYYY"` — Model tabs derive year sequences via `=YEAR('Income Statement'!{col}6)`, which returns 1899 on text headers. Look up real FY-end dates from the filings (NVDA ≈ late Jan; MSFT = Jun 30; AAPL ≈ late Sep).

Data-tab header block: R1 `Company: {name} ({TICKER})`, R2 statement name, R3 `Units: USD in Millions`, R4 source, R6 bold header row, data from R7. Analysis-tab header block: R1 `{Company} — {Tab Title}`, R2 key identity (e.g. `ROE = RNOA + FLEV × Spread`), R3 `All values linked to {source} via formulas`.

## Formatting standards

| Element | Spec |
|---|---|
| Hardcoded inputs | font #0000FF (blue) |
| Assumption block (model rows 11–17) | fill #FCE5CD |
| Return rows (ROE/RNOA) | fill #FFF2CC, bold |
| Abnormal earnings / FCFE | fill #D9EAD3, bold |
| Currency | `#,##0;(#,##0)` |
| Rates/margins | `0.0%` |
| Section headers | ALL CAPS, bold, blank row above and below |
| Column A width | 48 data tabs, 42 analysis/model tabs |
| Data column width | 16 (IS/BS/CF, Condensed, DuPont), 14 (Model), 18 (Summary) |
| Classification column | 25 |
| Freeze panes | column A on Model tabs |

```python
from openpyxl.styles import Font, PatternFill
BLUE = Font(color='0000FF'); BOLD = Font(bold=True)
ORANGE = PatternFill('solid', start_color='FCE5CD')
YELLOW = PatternFill('solid', start_color='FFF2CC')
GREEN  = PatternFill('solid', start_color='D9EAD3')
ws.freeze_panes = 'B1'
ws.column_dimensions['A'].width = 42
```

## Script persistence

Each stage saves its generators under `coverage/{TICKER}/scripts/` — the full chain, in its run order: `build_statements.py → build_condensed.py → build_quarterly_sections.py → build_core_bridge.py → build_quality.py → build_guidance.py → build_model.py` (+ `build_multiples.py`, `rationalize_price.py`). Scripts must be re-runnable: parameterize by ticker and paths, read inputs from `assumptions.json` and `rowmap.json` rather than inlining them, and rebuild their tabs/regions idempotently (delete-and-recreate their OWN regions only — and because upstream scripts drop downstream regions, always resume the chain from the first script re-run). Analyst-editable state (classification toggles, bridge Include? toggles, rate overrides) must be read back — and sidecar-persisted where a wipe precedes the rebuild — never silently reset. bav-update runs these with refreshed data instead of regenerating code — losing them forces a full rewrite next quarter.

## Reference implementations

- `build_multiples_reference.py` — battle-tested Valuation Multiples builder (split-consistent EPS bases, item-2.02 8-K release dates, formula evaluation); copy and adapt per ticker.
- `Reference_Parameterized_Model.gs` / `MultiScenario_Parameterized_Model.gs` — the original Google Apps Script implementations; authoritative for model-tab layout and formula semantics. Generate a `.gs` only if the user asks for Google Sheets output, and then modify only `getScenarioConfigs()`.
- The public repo's `example/GOOGL_Demo_Integrated_Financials.xlsx` — a full real-data build (illustrative model inputs) showing every tab's finished geometry.
