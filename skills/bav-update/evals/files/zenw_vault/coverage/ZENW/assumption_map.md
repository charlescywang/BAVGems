# ZENW Assumption Map — 2026-06-01

Every model input traced to its strategy-report source. Gaps go to the orchestrator; none remained at build.

| Strategy element (verbatim or cited) | Model input | Value(s) |
|---|---|---|
| Model Inputs Summary: Base growth Y1/Y2/Y3 = 13% / 12% / 11% | Base growthVector Y1–3 | 13% / 12% / 11% |
| §6 Base segment build-up: Platform 18/17/15.5, Infra 9/8/7.5, Services 8.5/7.5/7 | segments[].growthY1to3 (Base) | per segment |
| Bull H1: "attach rate 0.62 → 0.80 subs/port by FY2028 lifts Platform to +24%/+23%/+21%" | Bull growthVector Y1–3 | 18% / 17% / 15.5% (blended) |
| Bull H1: "software mix >55% of revenue by Y5 carries NOPAT margin to 18%" | Bull marginVector | 16.5% → 18% |
| Bear H1: "white-box reaches 25% of ports by FY2029 → Infrastructure capped at +4%/+3%/+2.5%" | Bear growthVector Y1–3 | 7% / 6% / 5.5% (blended) |
| Bear H1: "hardware GM to low-30s … NOPAT margin to 12.5% by Y10" | Bear marginVector | 15% → 12.5% |
| §4 accounting note: deferred-revenue float fades as enterprise mix matures | nowcRatioVector ramps (all) | 1% → 7.5–10% |
| §1 value-chain + moat §3: NARROW moat, durable in Bull only | terminal RNOA targets | Bear 1.25× / Base 2.0× / Bull 3.0× CoE |
| §8: Beta Bear/Base/Bull 1.30/1.15/1.05; Rf 4.2%; ERP 5% | costOfEquity | 10.70% / 9.95% / 9.45% |
| §8: effective tax rate 18% | taxRate (all scenarios) | 0.18 |
| §8: diluted shares 460M (10-K cover page fixture) | marketData.dilutedShares | 460 |

## Segment reconciliation (Y1–3)
- Base Y1: 0.45×18% + 0.35×9% + 0.20×8.5% = 12.95% vs growthVector[0] = 13.0% → Δ 0.05pp ✓
- Base Y2: 0.45×17% + 0.35×8% + 0.20×7.5% = 11.95% vs 12.0% → Δ 0.05pp ✓
- Base Y3: 0.45×15.5% + 0.35×7.5% + 0.20×7% = 11.0% vs 11.0% → Δ 0.0pp ✓
- Bull Y1–3: 17.73 / 16.73 / 15.20 vs 18 / 17 / 15.5 → max Δ 0.30pp ✓
- Bear Y1–3: 6.60 / 5.70 / 5.20 vs 7 / 6 / 5.5 → max Δ 0.40pp ✓

All within the ±0.5pp tolerance.

## Differentiation check
Bull−Bear Y1 growth spread 11pp (>5pp ✓); implied IVPS spread $16.93 → $99.55 (≫30% ✓).

## Anchor consistency
assumptions.json anchorRevenue 11,400 = workbook FY2025 revenue 11,400 ✓.
