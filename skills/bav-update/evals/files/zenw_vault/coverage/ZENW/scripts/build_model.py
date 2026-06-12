#!/usr/bin/env python3
"""ZENW residual-income (abnormal earnings) model engine.

Recomputes per-scenario IVPS and terminal RNOA from ../assumptions.json
(canonical schema v2). Anchor semantics mirror the Model tab layout:
Y1 beginning BS = FY2025 actuals from Condensed Financials; ratio vectors
apply from Y2; leverage (NetDebt/TotalCapital) carries forward from the
anchor; after-tax cost of debt = avg historical after-tax CoD x (1 - tax).

Usage:
  python3 build_model.py            # print results table
  python3 build_model.py --write    # also write `results` back into assumptions.json
                                    # (snapshot assumptions.json to ../history/ FIRST)

Fixture note: ZENW is the synthetic eval company. This script computes results;
it does not rewrite workbook tabs (the fixture workbook carries source +
Condensed + ALT DuPont as cached values).
"""
import json
import sys
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSUMPTIONS = HERE.parent / "assumptions.json"

# FY2025 anchor from Condensed Financials (cached values in the workbook).
ANCHOR = dict(revenue=11_400.0, nowc=114.0, nola=3_931.0, netdebt=-2_650.0)
ANCHOR["noa"] = ANCHOR["nowc"] + ANCHOR["nola"]
ANCHOR["equity"] = ANCHOR["noa"] - ANCHOR["netdebt"]
LEVERAGE = ANCHOR["netdebt"] / ANCHOR["noa"]          # NetDebt / Total Capital
HIST_AVG_AFTER_TAX_COD = 0.03544652087959672          # ALT DuPont FY2022-25 average


def run_scenario(s):
    ke, g = s["costOfEquity"], s["terminalGrowth"]
    cod = HIST_AVG_AFTER_TAX_COD * (1 - s["taxRate"])  # model rows 7-8 convention
    sales, prev = [], ANCHOR["revenue"]
    for t in range(10):
        prev *= 1 + s["growthVector"][t]
        sales.append(prev)
    pv_sum = bv_equity = term_rnoa = None
    pv_sum = 0.0
    for t in range(10):
        if t == 0:
            nowc, nola, nd = ANCHOR["nowc"], ANCHOR["nola"], ANCHOR["netdebt"]
        else:
            nowc = s["nowcRatioVector"][t] * sales[t]
            nola = s["nolaRatioVector"][t] * sales[t]
            nd = LEVERAGE * (nowc + nola)
        noa = nowc + nola
        eq = noa - nd
        nopat = sales[t] * s["marginVector"][t]
        ni = nopat - nd * cod
        ae = ni - ke * eq
        pv_sum += ae / (1 + ke) ** (t + 1)
        if t == 0:
            bv_equity = eq
        if t == 9:
            tv = ae * (1 + g) / (ke - g)
            pv_sum += tv / (1 + ke) ** 10
            term_rnoa = nopat / noa
    return dict(iv=bv_equity + pv_sum, terminalRNOA=round(term_rnoa, 4))


def main():
    a = json.loads(ASSUMPTIONS.read_text())
    shares = a["marketData"]["dilutedShares"]
    price = a["marketData"]["price"]
    out, weighted = {}, 0.0
    for name in ("Bear", "Base", "Bull"):
        s = a["scenarios"][name]
        r = run_scenario(s)
        ivps = round(r["iv"] / shares, 2)
        out[name] = {"ivps": ivps, "terminalRNOA": r["terminalRNOA"]}
        weighted += s["probability"] * ivps
        ratio = r["terminalRNOA"] / s["costOfEquity"]
        flag = "  << EXCEEDS 5x CoE — recalibrate" if ratio > 5 else ""
        print(f"{name:5s} IVPS {ivps:8.2f}   terminal RNOA {r['terminalRNOA']:.3f} "
              f"({ratio:.2f}x CoE){flag}")
    weighted = float(Decimal(str(weighted)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    gap = round((weighted - price) / price * 100, 1)
    print(f"Weighted IVPS {weighted} vs price {price} -> gap {gap}%")

    if "--write" in sys.argv:
        a["results"] = {"asOf": date.today().isoformat(), **out,
                        "weightedIVPS": weighted, "gapVsPricePct": gap}
        ASSUMPTIONS.write_text(json.dumps(a, indent=2) + "\n")
        print(f"results written to {ASSUMPTIONS} (snapshot to history/ first!)")


if __name__ == "__main__":
    main()
