# Stage 2 — The Assembler

Extract **up to 10 fiscal years** of as-presented financial statements (10 is the target; take as many as exist for younger filers, and record the actual span in extraction_log.md and `meta.dataYears`) from SEC filings into the workbook's hardcoded source tabs (Income Statement, Balance Sheet, Cash Flow Statement), with superset schema, sign conventions, restatement priority, and arithmetic validation. **These are the only hardcoded tabs in the workbook** — everything downstream links to them by formula.

The long window is the point for cyclical and acquisitive names — 10 years usually contains a full cycle. Expect more friction in the old years (label drift, XBRL tag migrations, segment redefinitions); the concept-keyed superset absorbs it and the per-year checksums catch what slips through.

Persist your extraction code to `coverage/{TICKER}/scripts/build_statements.py` so bav-update can re-run it against newer filings. Write a short `extraction_log.md` recording sources, restatement resolutions, and validation results.

## Data sourcing — priority order

### 1. edgartools (default — verified working)

```bash
pip3 install edgartools --break-system-packages -q
```

```python
from edgar import Company, set_identity
from edgar.financials import Financials

set_identity(os.environ.get("BAV_SEC_IDENTITY", "Your Name you@example.com"))  # SEC requires a contact identity — set BAV_SEC_IDENTITY

c = Company("GOOGL")
filings = c.get_filings(form="10-K").head(10)         # newest first

# Each 10-K carries 3 years of IS/CF but only 2 of BS. For a 10-year window,
# extract every OTHER filing — indices 0, 2, 4, 6, 8 (5 filings); generally
# ceil(N/2) filings for N years. Newest filing always wins on overlaps.
fins = [Financials.extract(filings[i]) for i in (0, 2, 4, 6, 8) if i < len(filings)]

df = fins[0].income_statement().to_dataframe()
# columns: concept, label, standard_concept, '2025-12-31 (FY)', '2024-12-31 (FY)', ...
```

Pull `income_statement()`, `balance_sheet()`, `cashflow_statement()` from each filing. The `label` column is the company's as-presented line item — preserve these labels verbatim in the workbook (the Stage 3 classification table depends on them). The period columns give you the exact fiscal year-end dates for column headers.

Notes:
- 10-K/A (amendments) supersede the original — `get_filings` returns them; prefer the amended filing for its years.
- Fiscal-year companies (NVDA ends late Jan, MSFT ends Jun 30, AAPL late Sep): the period column dates are authoritative; never assume calendar years.
- Statement of Shareholders' Equity: extract if cleanly available; otherwise note its omission in extraction_log.md (downstream stages don't require it).

**Balance-sheet specifics (learned the hard way on GOOGL):**
- A 10-K balance sheet carries only TWO years (IS/CF carry three) — N years of BS needs **ceil(N/2)** filings at every-other indices (`0, 2, 4, …`; a 10-year window = five 10-Ks).
- **Key the superset by (XBRL concept, label), not label alone.** The same label can appear on both sides — GOOGL's "Deferred income taxes" is an asset (`DeferredIncomeTaxAssetsNet`) and, in older years, also a liability (`DeferredIncomeTaxLiabilitiesNet`). Label-keyed merging silently drops one.
- **Normalize labels** before any matching: as-filed labels carry non-breaking spaces (`\xa0`) — `' '.join(label.replace('\xa0',' ').split())`.
- **Exclude non-additive rows:** subtotals ("Total …"), VIE memo lines, goodwill-by-segment breakdowns, fair-value-level disclosures, AOCI component breakdowns, and Title-Case duplicate equity restatements. Verify: classified detail items must sum exactly to the as-filed totals per year — assert it, per statement, per year.
- Missing item-years in the superset stay **blank**, never zero.

### 2. Fallback: EDGAR companyfacts JSON (no dependencies)
`https://data.sec.gov/api/xbrl/companyfacts/CIK{cik10}.json` with a User-Agent header (10 req/s limit). Concept-keyed rather than as-presented — map us-gaap concepts to labels and reconstruct ordering. Common concept synonyms: Revenues ↔ RevenueFromContractWithCustomerExcludingAssessedTax ↔ SalesRevenueNet; CostOfRevenue ↔ CostOfGoodsAndServicesSold; CashAndCashEquivalentsAtCarryingValue ↔ CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents.

### 3. Fallback: datamule package (`Sheet().download_xbrl(ticker=...)`, `get_table('simple_xbrl', ...)`) — same concept-mapping caveats.

### 4. Last resort: user-uploaded 10-K PDFs, then targeted web search — flag every web-sourced value in extraction_log.md.

If the user uploaded filings, parse those first and use edgartools to fill gaps.

## Assembly rules

1. **Restatement priority (auto-resolve, no user gate):** process filings newest → oldest; for overlapping years the newer filing wins. Log every conflict where values differ: `FY2022 Retained Earnings: kept $29,473M (FY2024 10-K) over $29,480M (FY2022 10-K) — restatement`. Escalate to the orchestrator only if the same year differs by >2% on a major line (revenue, total assets, equity) — that suggests a definition mismatch, not a restatement.

2. **Superset schema:** the row set is the union of line items across all years. A year missing an item gets a blank (not zero). Normalize trivially different labels ("Cash and cash equivalents" vs trailing footnote markers) but never merge economically distinct items.

3. **Sign conventions:** revenue/gains/inflows positive; costs/expenses/outflows negative, stored as negative numbers. Display via Excel format `#,##0;(#,##0)`. Subtotals must compute from stored signs (Revenue + COGS = Gross Profit with COGS negative).

4. **Checksums (blocking):**
   - IS: components sum to each reported subtotal and to net income.
   - BS: Assets = Liabilities + Equity, every year, to the dollar.
   - CF: Operating + Investing + Financing + FX = net change in cash; opening + change = closing.
   Re-extract on failure (usual causes: missed sign flip, subtotal double-count, concept mapped to wrong line). Escalate only if a failure survives re-extraction; never ship an unbalanced tab silently.

5. **Column headers are fiscal year-end DATES** — `datetime.date` objects formatted `"MMM DD, YYYY"`, never strings like "FY2025". Downstream Model tabs call `=YEAR()` on them; a text header breaks the year sequence (returns 1899).

## Workbook build

Tabs: `Income Statement`, `Balance Sheet`, `Cash Flow Statement` (+ `Shareholders Equity` if extracted) — exact names; Stage 3/4 formulas reference them. Header block per tab:

```
R1: Company: {Full Name} ({TICKER})
R2: Statement: {name}
R3: Units: USD in Millions
R4: Source: SEC 10-K filings (accession numbers in extraction_log.md)
R6: Line Item | {FY-end date} | ... | (oldest → newest, left → right) [bold]
```

Data starts row 7. Column A width 48, data columns 16. Formatting per `xlsx_patterns.md`.

Also build a **`Valuation Multiples`** tab via a persisted `scripts/build_multiples.py` (battle-tested reference implementation: `references/build_multiples_reference.py` — copy and adapt; it already handles the sharp edges: Yahoo prices are split-adjusted even 'unadjusted', workbook EPS bases can be mixed across eras, and non-earnings 8-Ks must be filtered by item 2.02): per fiscal year — earnings-release date (first post-FYE 8-K with item 2.02), price 30 calendar days after release (post-digestion, not announcement noise; as-traded basis reconciled to EPS basis via split factors with implied-share consistency checks), trailing P/E, forward P/E (next FY realized EPS; newest year takes a consensus estimate as a blue editable cell), PEG (n/m when growth or EPS ≤ 0 — the honest answer for cyclicals), P/S and P/B via derived market cap. Facts tab; bav-update appends a column when a new fiscal year lands.

Also build **quarterly sections BELOW the annual blocks, in the same three source tabs**, via a persisted `scripts/build_quarterly_sections.py` (run order: build_statements → build_condensed → build_quarterly_sections — the upstream scripts rebuild their tabs from scratch and would drop the quarterly regions, so this script must re-run after either; it is idempotent and clears only its own regions):

- **Window:** fiscal years ≥ (anchor FY − 1) plus all reported current-FY quarters (≈10–12 quarter columns; the window slides at each annual re-anchor). One column per quarter, hardcoded as-filed 10-Q values, same sign conventions and label/concept machinery as the annual extraction.
- **Q4 never exists as a filing** — companies file three 10-Qs. Derive it: IS/CF Q4 = annual FY value − Σ(Q1–Q3); BS Q4 = the fiscal year-end balance sheet. Label the columns as derived. **EPS and share-count rows are non-additive — leave Q4 blank, never derive.**
- **10-Q cash-flow statements are filed cumulative (YTD)** — de-cumulate: Qn = YTDn − YTDn−1; begin-cash of Qn = end-cash of Qn−1. A classic silent error; the per-quarter cash roll-forward checksum catches it.
- **10-K vs 10-Q line granularity differs** (e.g. a 10-K folds the 10-Qs' "Other current assets" movement into "Other"): fold each CF section's mismatches — 10-Q-only rows' Q1–Q3 and 10-K-only rows' FY values — into that section's "Other" row when deriving Q4, with a logged warning. Never ship a column that doesn't foot.
- Each quarter column reproduces its own 10-Q's current-period column; comparative columns in later 10-Qs are not used, so intra-year restatements are absorbed by the derived Q4 (note this in the section banner).
- **Per-quarter checksums are blocking** (same IS/BS/CF structure checks as annual, every quarter column including derived Q4) and quarterly implied equity must tie reported equity exactly in every quarter. Write `quarterly_extraction_log.md`.
- Stage 3 extends the analysis tabs with quarterly sections too (see stage3_analyst.md): quarterly Condensed (NOPAT + aggregates) whose classification cells **reference the annual classification table** — one toggle source — and a quarterly DuPont (flows annualized ×4).

**bav-update appends the new quarter automatically every 10-Q (facts clause, unattended runs included)** — this is how new financials reach the spreadsheet between annual extensions.

## Return to orchestrator
Years covered with FY-end dates, filings used (accessions), restatement conflicts auto-resolved (count + the material ones), checksum results per statement per year, line items that needed fallback sourcing, and any escalations.
