# BAV plugin evals (v2)

Eval suites for the three skills, written against the v2.0.0 architecture (orchestrator + per-stage rubrics + coverage vault). Each skill has its own `evals/` directory:

```
skills/bav-pipeline/evals/   evals.json (6 cases) + trigger_eval.json + files/ + this README
skills/bav-update/evals/     evals.json (3 cases) + trigger_eval.json + files/
skills/bav-brief/evals/      evals.json (3 cases) + trigger_eval.json + files/
```

There are two kinds of evals, matching the `anthropic-skills:skill-creator` tooling.

## 1. Behavioral evals (`evals.json`)

Schema per skill-creator's `references/schemas.md`: each case has `prompt`, `expected_output`, `files` (paths relative to the skill root), and `expectations` — verifiable statements a grader agent checks against the run's transcript and output files.

Run them with the skill-creator flow ("run the evals for bav-pipeline"): it spawns an executor subagent per case (skill + prompt + input files), optionally a baseline run without the skill, then a grader that scores each expectation, and renders everything in the eval viewer.

Conventions used by these cases:

- **Setup preamble.** Prompts that need a coverage vault or workbook tell the executor to *copy* the fixture into its working directory first. This keeps fixtures pristine across runs and gives the grader a deterministic output location.
- **Pinned clock.** Prompts state "assume today is 2026-06-10" wherever staleness or catalyst logic matters, so cases stay deterministic as real time passes.
- **Pre-answered gates.** The pipeline's review gates are interactive (AskUserQuestion), but eval executors run headless. Prompts therefore pre-supply the user's gate answers ("when you present the classification review, take these as my answers…") or instruct "state what you would ask, then proceed with your recommendation and document it". The expectations still require the gate *content* to be presented (e.g. Gate B must show only the ambiguous classifications).
- **Hermetic by default.** Cases on the fictional ticker ZENW need no network. Only `bav-pipeline` case 2 (GOOGL full pipeline) exercises live web research + EDGAR — expect it to be slow, and grade Stage-2 specifics leniently if SEC data availability shifts.

### What the cases cover

| Behavior under test | Where |
|---|---|
| Gate A (scenario assumptions, probabilities, watchlist) | pipeline #2 |
| Stage 2 has **no** gate (restatements auto-resolve, logged) | pipeline #2 |
| Gate B shows **ambiguous classifications only**, with implications | pipeline #1, #2, #6 |
| Gate C calibration bands + **5×CoE bounce rule** | pipeline #3 (in-band), #4 (bounce) |
| `assumption_map.md` required before model code, segment blend ±0.5pp | pipeline #2, #3, #6 |
| `strategy_report.md` never contains model results | pipeline #2, #3, #4, #6 |
| Coverage-vault file contracts (schema v2 JSON, history snapshots, journal, valuation_log, dossier frontmatter, `_universe.md`, persisted `scripts/`) | pipeline #2, #3, #6; update #1, #2 |
| Routing: existing coverage → suggest bav-update | pipeline #5 |
| `--auto` mode: defaults applied, decisions logged in journal + memo | pipeline #6 |
| Legacy (v1) assumptions migration with untouched history snapshot | update #1 |
| Forecast-vs-actual diff + tripped watchlist trigger requires action | update #1 |
| "No changes" is a valid update (journal yes, no log row, no edits) | update #2 |
| Missing coverage → stop and offer bav-pipeline | update #3 |
| Brief is strictly read-only; staleness/needs-rebuild computed honestly | brief #1–#3 |
| "Did they beat?" answered from vault as-of date, defers to bav-update | brief #3 |

## 2. Trigger evals (`trigger_eval.json`)

Routing-boundary tests for the skill **descriptions**, in the format consumed by skill-creator's `scripts/run_eval.py`: a JSON array of `{"query", "should_trigger"}`. All three files share the same 18-query pool with per-skill flags, so the boundaries are tested explicitly — e.g. *"MSFT reported earnings last night, update the model"* must trigger **bav-update** and not the other two; *"rebuild it from scratch"* must trigger **bav-pipeline**, not bav-update; *"where do we stand"* belongs to **bav-brief**. Negatives include the hard near-misses (LBO model, "update the README in models/", price lookups).

Run from the skill-creator skill directory (it needs `claude -p` on PATH; ~18 queries × 3 runs each, so budget a few minutes per skill):

```bash
python -m scripts.run_eval \
  --eval-set /path/to/bav-plugin/skills/bav-update/evals/trigger_eval.json \
  --skill-path /path/to/bav-plugin/skills/bav-update \
  --runs-per-query 3 --verbose
```

A query passes when its trigger rate lands on the right side of 0.5. If a description under-triggers, skill-creator's description-optimization loop (`scripts/run_loop.py`) takes the same eval-set file.

## Fixtures (`files/`)

- **ZENW (Zenwave Systems)** — a *fictional* company, so hermetic cases fabricate no real-company data. Generated by `files/make_zenw_fixtures.py` (openpyxl required): source workbook (IS/BS/CF, FY2021–25, balanced to the dollar, with the five classically ambiguous BS items), post-Stage-3 analysis workbook (Condensed Financials + ALT DuPont as cached values; NOA = Total Capital and the DuPont identity hold exactly), schema-v2 `ZENW_assumptions.json` (`results: null`, segment blends within ±0.5pp, terminal RNOAs engineered to 1.25×/2.0×/3.0× CoE), and the consistency report `zenw_fixture_report.txt`. Regenerate after edits by re-running the script — never hand-edit the workbooks.
- **`msft_vault/`** (pipeline) and **`legacy_vault/`** (update) — frozen copies of a real pre-v2 MSFT position: legacy key names (`revenueGrowthVector`), no `schemaVersion`, no scripts/, no recorded valuation. This is the genuine legacy-migration specimen; do not "fix" it.
- **`zenw_vault/`** (update) — a clean, complete schema-v2 position for ZENW (dossier, journal, log, memo, assumption_map, history/, scripts/ including a working `build_model.py` that reproduces the recorded results exactly).
- **`vault/`** (brief) — a frozen 3-ticker snapshot: GOOGL stale-but-valued, MSFT needs-rebuild, NVDA stub. Captured 2026-06-10, before the live vault's GOOGL refresh — that staleness is the point; do not re-sync it from `coverage/`.
