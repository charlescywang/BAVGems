# Zenwave Systems, Inc. (ZENW) — Strategy Report

*Prepared 2026-06-01. Model INPUT document — contains no valuation results. Fictional company: this report is an eval fixture authored to be internally consistent with the ZENW workbook and assumptions.json fixtures.*

## 1. Business Model Mechanics

**Revenue architecture (FY2025 revenue $11,400M, +15.2% YoY):**

| Segment | Revenue share | FY2025 growth | Trajectory |
|---|---|---|---|
| Observability Platform (SaaS) | 45% | +19% | accelerating — AI telemetry attach |
| Network Infrastructure (hardware) | 35% | +11% | decelerating — refresh cycle maturing |
| Professional Services & Support | 20% | +9% | steady — tracks installed base, ~1-yr lag |

**Unit economics:** Platform sells per-monitored-node subscriptions (ARR $4.9B, net revenue retention 115% as of Q4 FY2025); hardware carries a 38% segment gross margin and pulls platform attach at ~0.62 subscriptions per switch port shipped (up from 0.55 in FY2023). Consolidated gross margin 60%; NOPAT margin 16.4% FY2025.

**Differentiation levers:** telemetry data captured at the silicon layer that pure-software rivals cannot see; switching costs from 3-year platform contracts wired into network operations runbooks.

**Value-chain position:** merchant-silicon suppliers (Broadcom-class) capture component margin below; hyperscaler-native monitoring tools compete for the budget above. Zenwave monetizes the integration seam.

## 2. Success & Risk Factors (Quantified)

These rows are the KPI watchlist in assumptions.json — each is checkable from public data quarterly.

| Factor | Metric | Current (as of) | Bear trigger | Bull trigger |
|---|---|---|---|---|
| Platform momentum | Platform ARR growth YoY | 19% (Q4 FY2025) | <12% two consecutive qtrs | >22% sustained |
| Expansion economics | Net revenue retention | 115% (Q4 FY2025) | <108% | >120% for 2 qtrs |
| Hardware margin structure | Hardware segment gross margin | 38% (Q4 FY2025) | <33% two consecutive qtrs | >41% |
| Forward demand | RPO growth YoY | 21% (Q4 FY2025) | <10% | >25% |

Risk coverage: regulatory (component export controls — low exposure), market (campus refresh pause), operational (single CM concentration in hardware), technological (merchant silicon + hyperscaler-native AIOps displacing the platform — the Bear mechanism).

## 3. Industry Structure & Competitive Dynamics

Market share ~14% of enterprise network observability today, trajectory to 16–17% on current win rates (3-yr view). Trend table: AI network telemetry = tailwind (est. +2–4pp platform growth); white-box/merchant silicon = headwind (est. −2 to −5pp hardware growth, −300bps hardware GM in adverse case); campus refresh cycle = neutral-to-tailwind through FY2027.

| Competitor | Growth | NOPAT margin | Positioning |
|---|---|---|---|
| Meridian Networks (fict.) | +9% | 14% | hardware-heavy incumbent, weak SaaS attach |
| Cobalt Observability (fict.) | +24% | 8% | pure-software, no silicon telemetry |
| Hyperscaler-native tools | n/m | n/m | free-tier bundling pressure at the low end |

## 4. Strategic Translation to Financials — the Analytical Handoff

| KPI | Strategic role | Current value | Target/threshold | Location in filings |
|---|---|---|---|---|
| Platform ARR growth | top-line engine | 19% | sustain >15% through FY2028 | earnings supplement |
| NRR | margin-accretive expansion | 115% | hold ≥112% | 10-K key metrics |
| Hardware GM | funds the attach motion | 38% | hold ≥35% | 10-Q segment note |
| RPO growth | leading indicator of Y2–3 growth | 21% | ≥ revenue growth | 10-Q revenue note |
| Software mix | NOPAT margin driver | 45% of revenue | 55% by FY2030 (Bull) | MD&A |

Accounting notes: deferred revenue (10% of revenue, current) funds negative-to-low NOWC today — expect the float to fade as enterprise mix matures; operating leases material (ROU $684M); SBC ~3.3% of revenue, treated as a true expense in NOPAT.

## 5. Financial Baseline & Catalysts

Most recent quarter (Q4 FY2025, ended 2025-12-31): revenue $3,050M (+15% YoY), operating income $625M, diluted EPS $1.12, FCF $445M; segment split 46/34/20. FY2025: revenue $11,400M, operating income $2,280M (20.0%), net income $1,947M, FCF $1,725M.

Catalysts (6–12 months): Q1 FY2026 print (2026-07-24) — first quarter with AI-telemetry SKU in full release; FY2027 hardware refresh pre-announcements (Nov 2026); annual platform pricing action (Jan 2027).

**Street consensus** FY2026: revenue $12,860M (+12.8%), EPS $4.85. Base case Y1 growth of 13% sits within 0.2pp of consensus — no departure to justify.

## 6. Scenario Framework (Bull / Base / Bear)

| Scenario | Key assumptions | Revenue impact | Margin impact | Probability |
|---|---|---|---|---|
| Bear | merchant-silicon substitution + AIOps displacement | growth 7% fading to 2.5% | NOPAT margin 15% → 12.5% | 25% |
| Base | attach holds, NRR 115%, refresh on schedule | 13% fading to 3.5% | ~16% easing to 15.5% | 50% |
| Bull | AI telemetry must-have; software mix >55% | 18% fading to 4% | 16.5% rising to 18% | 25% |

**Bear — two hypotheses.**
- *H1 (hardware hollow-out):* white-box adoption in enterprise campus reaches 25% of ports by FY2029 → Network Infrastructure growth capped at +4%/+3%/+2.5% (Y1–3) and hardware GM to low-30s; pricing concessions drag consolidated NOPAT margin to 12.5% by Y10. Promotes to Base if white-box share stalls <15%.
- *H2 (AIOps displacement):* hyperscaler-native tooling wins the AI-operations transition; Platform growth held to +10%/+9%/+8.5% with NRR slipping under 108%. Promotes to Base if NRR stabilizes ≥112%.

**Base.** Segment build-up Y1–3: Platform 18/17/15.5, Infrastructure 9/8/7.5, Services 8.5/7.5/7 → blended 13/12/11 (share-weighted, reconciles within 0.5pp). Margins ~16% easing to 15.5% as hardware mix pressure offsets software gains. Anchored to consensus and FY2026 guidance ($12.8–12.95B).

**Bull — two hypotheses.**
- *H1 (AI telemetry attach):* attach rate 0.62 → 0.80 subs/port by FY2028 lifts Platform to +24%/+23%/+21% (Y1–3); software mix >55% of revenue by Y5 carries NOPAT margin to 18%. Promotes to Base if attach plateaus ≤0.70.
- *H2 (expansion flywheel):* NRR >120% sustained two-plus quarters on module upsell → adds ~2pp to consolidated growth in Y2–3 and holds terminal growth at the 4% cap. Promotes to Base if NRR reverts to ~115%.

**Scenario Differentiation Matrix**

| Key uncertainty | Bear | Base | Bull |
|---|---|---|---|
| White-box share of campus ports by FY2029 | 25% | 12–15% | <10% |
| Platform ARR growth (Y1–3 avg) | ~9% | ~17% | ~23% |
| NRR | <108% | ~115% | >120% |
| Software mix by FY2030 | 42% | 48% | >55% |

## 7. Valuation Context

At $84.00 (2026-06-01): market cap $38.6B (460M diluted), net cash $2.65B → EV $36.0B. Multiples: P/E 19.8× (FY2025), EV/Revenue 3.2×, EV/EBITDA ~12.6×. Peers: Meridian 14× P/E / 2.1× EV/Rev; Cobalt 9.8× EV/Rev (unprofitable); large-cap networking comps 17–22× P/E. No sum-of-the-parts case — segments are operationally entangled. Hidden assets: none material (equity-method stakes $240M at book). This section anchors Gate C's sanity check; it is context, not output.

## 8. Model Inputs Summary

```
MODEL INPUTS SUMMARY
Anchor: FY2025 (ended 2025-12-31) — Revenue $11,400M (sourced: FY2025 10-K fixture)
Base case: growth Y1/Y2/Y3 = 13% / 12% / 11%; NOPAT margin Y1 → terminal = 16% → 15.5%
NOWC/Sales 1.0% FY2025, ramping toward maturity; NOLA/Sales 34.5% FY2025, ramping up
Effective tax rate: 18%; Beta Bear/Base/Bull = 1.30 / 1.15 / 1.05 (Rf 4.2%, ERP 5%)
Key sensitivities: ±1pp Platform growth ≈ ±$51M Y1 revenue; ±0.5pp NOPAT margin ≈ ±$64M NOPAT
Probability weights: Bear 25 / Base 50 / Bull 25
Diluted shares: 460M (FY2025 10-K cover page fixture)
```
