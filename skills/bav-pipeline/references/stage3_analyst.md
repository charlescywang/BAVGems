# Stage 3 — The Analyst

Add the analysis layer to the workbook: **Condensed Financials** (NOPAT reformulation + operating/financial balance-sheet classification with interactive dropdowns) and **ALT DuPont** (ROE = RNOA + FLEV × Spread), each with **quarterly sections below the annual blocks**; a **Core Earnings Bridge** at the bottom of the Income Statement tab; and an **Earnings Quality** tab (accruals, Beneish, Piotroski, Benford). Every cell links back to the source tabs by formula — no hardcoded financial values (see `xlsx_patterns.md`); the only exceptions are researched non-recurring item amounts (bridge) and per-filing Benford statistics, both facts with documented provenance. Persist code to `coverage/{TICKER}/scripts/` (`build_condensed.py`, `build_quarterly_sections.py`, `build_core_bridge.py`, `build_quality.py`).

**Read `coverage/_conventions.md` FIRST.** It carries the analyst's standing classification calls (e.g. accrued compensation and operating-lease liabilities → Financial Liability; non-marketable securities → Operating LT Asset) and the canonical tab layout — those override the textbook defaults below. The analyst also edits workbooks directly: if you are touching an existing workbook, read the current classification column back before rewriting anything; analyst toggles have gate-answer authority.

**Completeness rule (no residual, ever):** every as-filed balance-sheet line item appears in the classification table and gets a category, every year. Implied equity (NOA − Net Debt) must then tie to reported equity exactly in all years — there is NO "Unclassified Residual" row. If it doesn't tie, the Stage 2 extraction is incomplete (missing line, merged duplicate-label rows, memo row included): fix it upstream, never plug it.

## Condensed Income Statement (rows ~7–17)

| Row | Item | Formula |
|---|---|---|
| Net Income | `='Income Statement'!{col}{row}` |
| Interest Expense | ABS() of IS value — forced positive |
| Interest Income | linked |
| Net Interest Expense | = IntExp − IntInc |
| Pretax Income, Tax Expense | linked |
| Effective Tax Rate | = Tax / Pretax wrapped in IFERROR |
| Net Interest After Tax | = NetInt × (1 − ETR) |
| **NOPAT** | **= Net Income + Net Interest After Tax** |

Interest fallback: if interest items aren't on the IS, look in the CF statement or the notes data; if still missing, report it to the orchestrator — never default to zero silently.

## Classification table with dropdowns (the core interactive feature)

This replicates the original Gems Google-Sheets design. Build a flat **Balance Sheet Classification Table** listing **every** non-subtotal BS line item, one row each:

```
Line Item | FY values (one col per year, formula-linked to the BS tab) | Classification (dropdown) | Notes
```

The classification column sits immediately right of the year columns (so year columns share letters with the rest of the tab). Changing a dropdown must recompute NOA, Net Debt, and all DuPont ratios — that's what makes the workbook a living tool.

Categories (8, verbatim — matches the Gems sheets): `Operating Working Capital Asset`, `Operating Working Capital Liability`, `Operating Long-Term Asset`, `Operating Long-Term Liability`, `Financial Asset`, `Financial Liability`, `Equity`, `Exclude`.

```python
from openpyxl.worksheet.datavalidation import DataValidation
categories = ('"Operating Working Capital Asset,Operating Working Capital Liability,'
              'Operating Long-Term Asset,Operating Long-Term Liability,'
              'Financial Asset,Financial Liability,Equity,Exclude"')
dv = DataValidation(type="list", formula1=categories, allow_blank=False, showDropDown=False)
dv.add(f'{class_col}{table_start}:{class_col}{table_end}')
ws.add_data_validation(dv)
```

Default classification rules:
- "Cash", "Marketable securities", "Investments" (incl. non-marketable securities) → Financial Asset
- "Debt", "Borrowing", "Notes payable", "Commercial paper" → Financial Liability
- Other current assets/liabilities → Operating Working Capital Asset/Liability
- Other non-current assets/liabilities → Operating Long-Term Asset/Liability
- Stock/paid-in capital, AOCI, retained earnings, treasury → Equity
- `Exclude` is for reconciliation edge cases (e.g. held-for-sale buckets the user wants out of NOA)
- "Total …" subtotal rows are **not listed in the table at all**

Style the classification cells blue (editable input) and the header row with a light fill.

**Flag ambiguous items with ⚠️ for Gate B** — these are genuine judgment calls; present each with its analytical implication:
- Operating lease ROU assets / lease liabilities (operating vs. financial; asymmetric treatment is common and defensible)
- Deferred tax assets/liabilities (operating vs. exclude)
- Pension obligations (operating LT vs. financial)
- Short-term investments (financial vs. operating, by purpose)
- Equity-method investments (operating vs. financial)

After Gate B, the user's choices become the dropdown defaults, with flagged cells reading e.g. `Op. Long-Term Asset ⚠️ (User: Operating)`.

## Condensed Balance Sheet — SUMIF aggregation over the classification table

Every aggregate is a SUMIF over the classification column, with the year columns of the table as the sum range — reclassification flows through automatically, no helper area needed (the table IS the data):

```python
ws[f'{col}{owca_row}'] = (
    f'=SUMIF(${class_col}${table_start}:${class_col}${table_end},'
    f'"Operating Working Capital Asset",{col}${table_start}:{col}${table_end})'
)
```

Required structure — a **compact aggregates block with no detail rows** (detail lives in the classification table directly below it). Fills per the analyst's template: subtotals yellow `FFF2CC`, answer rows green `D9EAD3`, section headers gray `F2F2F2`:

```
Operating Working Capital Assets        (SUMIF)
Operating Working Capital Liabilities   (SUMIF)
NET OPERATING WORKING CAPITAL (NOWC)    = OWCA − OWCL          [yellow]
Operating Long-Term Assets              (SUMIF)
Operating Long-Term Liabilities         (SUMIF)
NET OPERATING LT ASSETS                 = OLTA − OLTL          [yellow]
NET OPERATING ASSETS (NOA)              = NOWC + NOLA          [green]
Financial Assets                        (SUMIF)
Financial Liabilities                   (SUMIF)
NET DEBT                                = Fin Liab − Fin Assets [green]
EQUITY (NOA − Net Debt)                                         [green]
Reported Equity                         (linked to BS)
TOTAL CAPITAL                           = Net Debt + Equity
CHECK                                   = IF(ABS(Equity − Reported Equity)<1,"OK","CHECK")
```

The CHECK row is the integrity tripwire (completeness rule above) — it replaces any residual line. The classification table starts immediately below this block. Direct cell references instead of SUMIF are forbidden — the interactive system IS the deliverable.

## ALT DuPont tab

Per year (oldest year shows "n/a" — no prior-year averages):

```
Sales Growth        = Rev_t / Rev_{t-1} − 1
NOPAT Margin        = NOPAT / Revenue
Avg NOA             = (NOA_t + NOA_{t-1}) / 2
Asset Turnover      = Revenue / Avg NOA
RNOA                = NOPAT Margin × Asset Turnover
Avg Net Debt        = (NetDebt_t + NetDebt_{t-1}) / 2
After-tax CoD       = Net Interest After Tax / Avg Net Debt
Spread              = RNOA − After-tax CoD
Avg Equity          = (Equity_t + Equity_{t-1}) / 2
FLEV                = Avg Net Debt / Avg Equity
Leverage Gain       = Spread × FLEV
ROE (decomposed)    = RNOA + Leverage Gain
Actual ROE          = Net Income / Avg Equity
Check               = |decomposed − actual| < 0.0001
```

All inputs are formulas into Condensed Financials. If Net Debt is negative (cash > debt), add the note row: "{Company} has negative Net Debt — FLEV is negative, so leverage REDUCES ROE relative to RNOA." Stage 4 reads After-tax CoD history from this tab — keep row labels exactly as above.

## Quarterly analysis sections (below the annual blocks, same tabs)

Stage 2's quarterly source sections (see `stage2_assembler.md`) get a matching analysis layer, appended by `build_quarterly_sections.py`:

- **Condensed Financials — Section D (quarterly NOPAT + aggregates) and Section E (quarterly classification block).** Same formula shapes as the annual blocks over quarter columns. The Section E class cells are **formulas referencing the annual Section C table cells** (e.g. `=$L$57`), never copies — one toggle source; flipping a Section C dropdown reclassifies the quarterly aggregates too. Equity components get the literal `="Equity"`. Quarterly implied equity must tie reported equity exactly in every quarter (blocking).
- **ALT DuPont — quarterly decomposition, flows annualized ×4**: margin = NOPATq/revq; turnover = revq×4/avgNOA; RNOA = margin × turnover; CoD = NIATq×4/avgND; ROE check = NIq×4/avgEq (the identity holds under consistent ×4 scaling). Sales growth is QoQ — label it so (not seasonally adjusted). The first quarter column's averages use the prior fiscal year-end from the annual Condensed columns.
- Quarterly ETRs are noisy (discrete items) — note it; the quarter's NIAT uses its own rate.

## Core Earnings Bridge (bottom of the Income Statement tab)

Restores the original Gem's non-recurring identification. Research every fiscal year's filings for discrete non-recurring PRETAX items — impairments, restructuring/severance, fines and settlements, disposal gains/losses, inventory writedowns beyond normal LCM **and their later carryover benefits** (symmetry: if a writedown is stripped, the subsequent lower-cost benefit must be stripped too), debt-extinguishment losses, step-acquisition gains. Persist findings to `scripts/nonrecurring_research.json` with per-item source, short evidence quote, and `amount_confidence` (disclosed / estimated / uncertain) — never invent precision. Tax one-offs (valuation-allowance releases, tax-law effects) are a separate list; accounting-estimate changes (useful-life extensions) are **disclosure-only memo rows, never adjustments**.

Bridge structure (annual block over year columns, then a quarterly block limited to items with disclosed quarter attribution):

```
Reported pretax income                  (linked)
{item rows: pretax effect in its FY column, as-filed sign; Include? toggle; source note}
Non-recurring pretax (included)         = SUMIF over the toggle column
CORE PRETAX INCOME                      = reported − included            [yellow]
Reported tax / Tax rate on adjustments  (rate defaults to the year's ETR — blue editable;
                                         TCJA-era ETRs make this genuinely judgmental)
{tax one-off rows, toggleable}
Core tax → CORE NET INCOME → core diluted EPS
CORE NOPAT (core NI + NIAT) → CORE NOPAT MARGIN                          [yellow]
```

**Identification is judgment: the toggles are Class A** (read back and preserved on every rebuild; an analyst toggle edit registers through the normal path). Core NOPAT follows the model's NOPAT definition, so the CORE NOPAT MARGIN row is what a margin re-anchor would reference — **building the bridge never re-anchors the model; that gates separately as a Stage 4 revision.**

## Earnings Quality tab (screens, not verdicts)

One tab, annual + quarterly columns, persisted as `build_quality.py`. Header states the epistemics verbatim: thresholds are calibrated on cross-sections — for a mega-cap a flag is a tripwire demanding explanation, not an accusation.

- **A. Accruals & cash conversion** (formulas): BS accruals = ΔNOA (one formula off Condensed — the reformulation pays off here), income accruals = NI − CFO, both scaled by avg NOA; CFO/NI.
- **B. Beneish M-Score** (formulas, YoY; quarterly = same-quarter-prior-year, t vs t−4): the 8 components with as-filed-granularity caveats noted in-tab (D&A line includes amortization; AQI without a securities term). Flag M > −1.78, grey > −2.22. Loss/crash years produce extreme components mechanically — say so in the tab.
- **C. Piotroski F-Score** (formulas): 9 signals, flag ≤3, strong ≥8.
- **D. Benford's law — per FILING, not per year**, on the filing's FULL XBRL fact set (every USD us-gaap fact in the instance, statements + notes, |v|≥1, deduped by concept/period/value; the statement faces alone are far too few numbers). MAD with Nigrini verdicts (≤0.006 close / ≤0.012 acceptable / ≤0.015 marginal / else nonconforming) + χ² (df=8, 5% crit 15.51). Script-computed facts, hardcoded with the method note; only filing-year columns are populated. Derived Q4 columns have no filing — blank.
- Persistent anomalies (e.g. a digit-deficit consistent across filings) go to the journal as standing observations — tracked until explained, not silently dropped.

## Return to orchestrator
The full proposed classification table (item → default), the ⚠️ list with one-line implications for Gate B, the NOA = Total Capital check result per year **and per quarter**, the DuPont reconciliation check result per year, headline RNOA/ROE by year, core-vs-reported NI deltas by year with the items driving them, and any earnings-quality flags (M/F/Benford) with one-line readings.
