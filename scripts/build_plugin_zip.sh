#!/usr/bin/env bash
# Rebuild the distributable plugin archive (bav-pipeline-plugin.zip) from the
# current on-disk plugin payload. Run from the repo root.
#
# Scope is intentional: .claude-plugin + skills + README.md only. It deliberately
# EXCLUDES automation/ (a clone-time, launchd feature installed via
# automation/install.sh), example/ (a repo-only demo), and legacy/. Do not widen
# this scope without reason — and bump the version in .claude-plugin/plugin.json
# BEFORE rebuilding so the packaged manifest carries the new version.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f bav-pipeline-plugin.zip
zip -r -X bav-pipeline-plugin.zip .claude-plugin skills README.md \
  -x '*.DS_Store' -x '*__pycache__*' -x '*.pyc' -x '*~$*' >/dev/null

echo "built bav-pipeline-plugin.zip ($(unzip -l bav-pipeline-plugin.zip | tail -1 | awk '{print $2}') files)"
echo "version: $(grep -o '\"version\": *\"[^\"]*\"' .claude-plugin/plugin.json)"
# leak guard: no private-coverage tickers may ship in shipped CODE/DOCS. Evals are
# excluded — their routing-test queries legitimately name real public tickers (e.g.
# "MSFT reported earnings", "value NVDA") and use synthetic ZENW/ACME fixtures. The
# remaining legitimate mentions are generic fiscal-year facts and the "MSFT-style"
# legacy-schema descriptor; anything else (e.g. a CIK map) is a real leak.
leak=0
for fpath in $(unzip -Z1 bav-pipeline-plugin.zip 'skills/*' | grep -v '/evals/'); do
  if unzip -p bav-pipeline-plugin.zip "$fpath" 2>/dev/null \
       | grep -nE "\b(MU|MSFT|NVDA|AMD)\b" \
       | grep -vEi 'jun 30|late jan|late sep|MSFT-style' >/dev/null; then
    echo "WARNING: possible private-ticker reference in $fpath — inspect before publishing" >&2
    leak=1
  fi
done
[ "$leak" -eq 0 ] && echo "leak guard: clean (private tickers only in eval routing-queries / fiscal facts)"
