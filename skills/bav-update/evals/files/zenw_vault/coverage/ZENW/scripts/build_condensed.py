#!/usr/bin/env python3
"""ZENW Condensed Financials / ALT DuPont builder (fixture).

The fixture workbook already carries Condensed Financials and ALT DuPont as
cached values (classifications confirmed at Gate B 2026-06-01: leases operating,
deferred taxes operating, pension operating LT, short-term investments financial,
equity-method operating LT). Regenerate via the eval fixture generator
(bav-pipeline/evals/files/make_zenw_fixtures.py). A real position's
build_condensed.py rebuilds the formula-driven tabs per references/stage3_analyst.md.
"""
print(__doc__)
