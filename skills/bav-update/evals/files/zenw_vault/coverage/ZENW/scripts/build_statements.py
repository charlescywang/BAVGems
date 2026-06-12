#!/usr/bin/env python3
"""ZENW source-tab builder (fixture).

ZENW is the synthetic eval company — its IS/BS/CF source tabs are generated
by the eval fixture generator (bav-pipeline/evals/files/make_zenw_fixtures.py),
not extracted from EDGAR (the ticker does not exist there). The workbook's
source tabs are already populated and checksum-clean; there is nothing to
re-extract. A real position's build_statements.py re-runs edgartools per
references/stage2_assembler.md.
"""
print(__doc__)
