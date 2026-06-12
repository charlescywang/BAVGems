# BAV Pipeline — an AI-maintained equity coverage system

A Claude Code plugin that builds and **continuously maintains** Business Analysis & Valuation (residual income / abnormal earnings) coverage of public companies. It is not a one-shot model generator: it is a coverage *system* — a persistent per-ticker knowledge base, a formula-driven Excel workbook you edit directly, a learning loop that registers your judgment, and a daily sentinel that keeps everything current as filings and news arrive.

Built on the framework popularized by Palepu/Healy-style BAV courses: reformulated financial statements (operating vs. financial), DuPont decomposition (ROE = RNOA + FLEV × Spread), and 10-year residual income valuation with explicit terminal-return calibration.

```
            YOU (the analyst)                          THE SYSTEM
   ┌──────────────────────────────┐      ┌─────────────────────────────────────┐
   │ Edit the Excel workbook      │      │ /bav-pipeline  full build (4 stages) │
   │  · toggle classifications    │ ───▶ │ /bav-update    earnings-driven refresh│
   │  · rewrite forecast vectors  │      │ /bav-news      uncertainty-keyed sweep│
   │ Write thinking in notes.md   │ ◀─── │ /bav-brief     read-only status      │
   └──────────────────────────────┘      │ sentinel.py    daily: EDGAR poll,    │
              ▲      git-backed vault    │   edit reconciliation, weekly sweeps, │
              └──── coverage/{TICKER}/ ──│   nag, dashboard                      │
                                         └─────────────────────────────────────┘
```

## What makes it different

1. **Your edits are first-class input.** You work in Excel — toggle a balance-sheet item between operating and financial, rewrite the Base-case growth vector — and the system *registers* your edits with provenance, re-runs the engine, and journals the change. The write-authority contract is explicit: analyst-initiated edits auto-register (your edit IS the sign-off); system-initiated proposals always wait for your gate.
2. **Everything traces.** Every model vector carries provenance back to a strategy-report element. Every revision snapshots the prior assumptions. Every classification toggle flows live through NOWC → NOA → DuPont → the valuation. A Python engine, validated to-the-cent against the workbook, recomputes everything headlessly.
3. **It runs while you sleep.** A launchd sentinel polls SEC EDGAR daily, fires incremental updates when filings land, sweeps the news weekly *against your dossier's stated uncertainties* (not generic headlines), and nags you about anything pending more than a week. Earnings can no longer sit unprocessed for six weeks — that failure mode is structurally impossible.
4. **It argues back, with numbers.** The price-rationalization function inverts the model at the market price: what growth, what terminal returns, what discount rate, or what un-modeled assets must be true for the market to be right — written up as scored stories, refreshed as the price moves.

## Lineage — from custom GPTs (Gemini Gems) to a Claude Code skill

This system began life as **four "custom GPT"-style instruction sets** — Gemini Gems — run by hand, one after another, inside Google's ecosystem: **Gemini** as the custom-GPT surface, **NotebookLM** for grounding the analysis in uploaded 10-Ks and research, and **Google Sheets + Apps Script** as the modeling surface. If you prefer that workflow (or want to build the equivalent as OpenAI custom GPTs), the original instructions live in [`legacy/`](legacy/) and still work as a complete manual system:

| Gem | Persona | What it does |
|---|---|---|
| **1. The Strategist** | Strategy analyst | Research-grounded strategy report: business-model mechanics, quantified success/risk factors, competitive dynamics, and a Bull/Base/Bear scenario framework — designed to be grounded in filings via NotebookLM |
| **2. The Assembler** | Data engineer | Turns uploaded 10-K filings into clean Income Statement / Balance Sheet / Cash Flow tabs: superset schema across years, newest-filing-wins restatements, sign conventions, arithmetic checksums |
| **3. The Analyst** | Apps Script engineer | Generates a Google Apps Script that builds **Condensed Financials** (operating/financial classification) and **ALT DuPont** tabs — every cell a formula linked to the source tabs, nothing hardcoded |
| **4. The Modeler** (+ 4Alt) | HBS finance professor | Reads the strategy report + workbook, writes three differentiated scenarios into `MultiScenario_Parameterized_Model.gs` (touching only `getScenarioConfigs()`), builds Model_Bull/Base/Bear + Scenario_Summary with per-scenario "Professor's Notes" |

The manual loop taught the lessons this repo is built on — and exposed its own limits: every handoff was copy-paste, every model build was a one-shot artifact with no memory, and nothing happened between sessions. **This repository is the build-out of those instructions into a Claude Code skill that does more**: the four personas became staged subagents handing off through file contracts instead of clipboards; PDF uploads became direct SEC EDGAR XBRL extraction; the one-shot spreadsheet became a persistent per-ticker vault with a learning loop that registers your own edits; and the "run it when you remember" cadence became a daily sentinel with earnings-driven updates, uncertainty-keyed news sweeps, and price rationalization. Same analytical DNA — reformulated statements, DuPont, calibrated residual income — different organism.

## Quickstart

**Prerequisites:** macOS, Python 3 (`openpyxl`; `edgartools` installs on first use), Microsoft Excel (or any xlsx editor), the [Claude Code CLI](https://claude.ai/install.sh) authenticated with a Claude subscription, and internet access for SEC EDGAR + research. Set your SEC contact identity (required by SEC fair-access policy):

```bash
export BAV_SEC_IDENTITY="Your Name you@example.com"
```

**Install the plugin:**

```bash
git clone https://github.com/<you>/bav-pipeline
claude --plugin-dir ./bav-pipeline        # or symlink skills/* into your project's .claude/skills/
```

**Start coverage on a first name** (do this in the repo/folder where you want your vault to live — the vault is created at `coverage/` under your working directory):

```
> /bav-pipeline AAPL
```

The pipeline runs four staged subagents — Strategist (web research → strategy report + draft assumptions), Assembler (up to **ten years** of as-filed SEC financials via XBRL, checksummed — long enough to contain a full cycle), Analyst (condensed statements + classification + DuPont), Modeler (three-scenario residual income model) — pausing at three review gates: your scenario assumptions, ambiguous balance-sheet classifications, and the final terminal-return calibration. Expect 30–60 minutes and a handful of decisions only you can make.

**Then live with it:**

```
> /bav-brief                 # where does my coverage stand?
> /bav-update AAPL           # they reported — refresh the model
> /bav-news AAPL             # what's the media saying about my uncertainties?
```

**Turn on continuous operation** (optional but recommended):

```bash
bash automation/install.sh   # daily 7:00 AM sentinel via launchd
```

## The vault — what lives where

Each ticker gets a directory under `coverage/` (Obsidian-compatible; open the folder as a vault):

| File | What it is | Who writes it |
|---|---|---|
| `dossier.md` | Living thesis, KPI watchlist with numeric triggers, valuation snapshot | system (you gate) |
| `assumptions.json` | **Single source of truth** for model inputs — vectors, probabilities, provenance | the write contract |
| `{T}_Integrated_Financials.xlsx` | The workbook: source tabs (annual + quarterly sections, core-earnings bridge) → condensed (toggleable) → DuPont → earnings quality → models → multiples, rationalization, guidance & consensus | system builds, **you edit** |
| `notes.md` | Your free-form thinking — read at every system touch, answered in the journal | **you** |
| `journal.md` | Dated record: every event, forecast-vs-actual, change, and rationale | system |
| `pending_decisions.md` | Proposals from unattended runs awaiting your gate | system (you clear) |
| `valuation_log.csv` | One row per model run — the full trajectory of your estimate | system |
| `rationalization.md` + workbook tab | What must be true at the market price (reverse-DCF stories) | system |
| `memo.md`, `strategy_report.md` | Results memo (outputs) vs. strategy report (inputs) — never mixed | system |
| `history/`, `scripts/` | Snapshot of every assumptions revision; the re-runnable build/engine code | system |

`coverage/_conventions.md` holds **your** standing conventions (classification calls, layout preferences) — every skill reads it first, and when your workbook edits diverge from it, that divergence is treated as feedback to adopt, not noise to overwrite.

## The example — open it now

[`example/ACME_Integrated_Financials.xlsx`](example/ACME_Integrated_Financials.xlsx) is a miniature, fully-consistent fictional company (3 fiscal years, one model scenario) you can open before running anything:

1. **Income Statement / Balance Sheet / Cash Flow** — the only tabs with hardcoded data; column headers are real dates (downstream formulas depend on it); every subtotal computes; A = L + E ties.
2. **Condensed Financials** — the interactive heart. Section C lists every balance-sheet line with a **dropdown in column E**. Click `Short-term investments` and flip it from `Financial Asset` to `Operating Working Capital Asset`: watch NOWC, NOA, and Net Debt recompute through the SUMIFs, then the DuPont ratios, then the model's anchor. That toggle-and-watch loop is the core analytical experience.
3. **ALT DuPont** — ROE decomposed into operating performance (RNOA) and financing effects (FLEV × Spread).
4. **Model_Base** — the 10-year residual income engine: blue cells are your inputs (growth/margin/intensity vectors, beta, shares); intrinsic value per share at the bottom. Real builds carry Bear/Base/Bull plus a probability-weighted Scenario_Summary.

[`example/ACME_assumptions.json`](example/ACME_assumptions.json) shows the canonical schema v2 with the parts that make the system honest: per-vector **provenance** (every number traces to a stated story), a **KPI watchlist** with numeric bear/bull triggers, and **terminal-return calibration targets** (Bear 1.0–1.5× cost of equity, Base 1.5–2.5×, Bull 2.5–3.5× — returns mean-revert unless you explicitly override, and overrides are recorded as your judgment).

Regenerate the sample anytime: `python3 example/build_sample.py` (it asserts every consistency check before writing).

## Living with it: how your changes register

After the initial build, three channels feed the system — one contract (`coverage/_conventions.md` → Write-authority contract) governs what gets applied:

**Channel 1 — you edit the workbook.** Open the xlsx, change whatever you want: classification dropdowns, the blue forecast-vector cells on the Model tabs, beta, the price cell on the Price Rationalization tab. **Save and close.** Then either:
- *Do nothing:* the sentinel's next daily pass notices the file changed, fires a headless reconciliation that reads the workbook back and diffs it against `assumptions.json`. Your edits are **Class A — the edit IS the sign-off** — so they auto-register: prior assumptions snapshot to `history/`, new values written with provenance *"analyst direct edit"*, the engine re-runs, journal + valuation log + dossier + dashboard update, and a notification reports the IVPS delta.
- *Or don't wait:* run `/bav-update {TICKER}` and the same reconciliation happens immediately, interactively.

Three carve-outs never auto-apply even though you made them — **probability cells** (your edit is recorded as your position and raised for confirmation), edits that **invert the scenario ordering** (Base above Bull means the labels need re-specifying), and edits implying a **new convention** (registered for that ticker; proposed for adoption into `_conventions.md`). Those wait in `pending_decisions.md` for an explicit yes.

**Channel 2 — you write in `notes.md`.** Free-form thinking: hunches, disagreements with the model, questions to chase. Every system touch (update, news sweep, brief) reads new entries and responds in the journal. Notes inform the analysis; they never move numbers directly.

**Channel 3 — the world changes.** Filings (the sentinel's daily EDGAR poll) and the weekly uncertainty-keyed news sweep run unattended. **As-filed numbers append to the spreadsheet automatically** — fact, not judgment: a new 10-Q adds a quarter column to the quarterly sections that sit below the annual blocks in every statement tab (full IS/BS/CF plus quarterly condensed, DuPont, and earnings-quality scores; Q4 is always derived, since no Q4 10-Q exists); a new earnings 8-K adds its outlook to the `Guidance & Consensus` ledger next to dated, never-backfilled consensus snapshots; a new 10-K extends the annual source tabs, the formula-linked condensed statements, the Core Earnings Bridge at the foot of the income statement, and (once the 30-day price window elapses) the `Valuation Multiples` tab (P/E, forward P/E, PEG, P/S, P/B at prices 30 days post-release) (all checksummed; politely deferred if you have the workbook open). Everything *interpretive* the unattended run produces is **Class B**: forecast-vs-actual diffs, watchlist verdicts, proposed revisions, and the re-anchoring decision a new 10-K raises all land in `pending_decisions.md` plus a notification — nothing touches `assumptions.json` until you gate it. Your next `/bav-update` session loads that file *first* and walks each item. Anything pending past 7 days nags daily.

**The price rationalization** refreshes with any update where price or assumptions moved materially — `scripts/rationalize_price.py all` re-inverts the model at the market price, regenerates the what-must-be-true stories (live Claude API call when `ANTHROPIC_API_KEY` is set; authored in-session otherwise), and rewrites both `rationalization.md` and the workbook tab. The tab's price cell is a blue editable input for instant formula-side what-ifs.

**A concrete day:** tonight you flip a deferred-tax toggle and cut the Base Y3 growth assumption; save, close. Tomorrow ~7:02 AM: *"{TICKER} registered: 1 reclassification, Base growthVector edit; weighted IVPS $310 → $327."* The journal shows old → new with your provenance, `history/` has the snapshot. Next earnings day, the sentinel catches the 8-K and scores the print against the forecasts you pre-registered — proposals wait for your gate that evening. Sunday's sweep checks the news against your dossier's open questions and journals "no material findings" when that's the truth. And `coverage/dashboard.html` (committed, phone-readable) always shows the whole universe — with a banner that turns red if the sentinel ever dies.

One habit makes it all smooth: **save and close the workbook when you're done editing.** The system reads it freely anytime; its own writes queue politely until the file is released, and your save is what triggers registration.

## Costs, scale, and honesty

- Designed for a **focused universe (≈10–30 names)** where your judgment is the bottleneck and the system's job is leverage, not replacement. A full build is one long Claude session; updates and sweeps are short headless runs (capped at 6/day by default).
- The headless permission profile (`automation/headless_settings.json`) is a guardrail, not a security boundary — unattended runs can execute Python. The real protections: runs see only your vault, every change is a pushed git commit (tamper-evident), and the wrapper owns `git push`. Read `automation/punchlist.md` for known sharp edges before trusting it unattended.
- Models are decision-support, not investment advice. The system is built to make its assumptions *inspectable and arguable* — that is the product.

## Architecture notes for the curious

- `skills/bav-pipeline/SKILL.md` is a thin orchestrator; per-stage rubrics live in `references/` (strategist, assembler, analyst, modeler, xlsx patterns, the full file-contract schema in `coverage_schema.md`, and the unattended-execution contract in `automation.md`).
- Stages hand off through **files, not prose**; subagents run with fresh context per stage.
- SEC data comes from EDGAR XBRL via [edgartools](https://github.com/dgunning/edgartools) (as-presented line items, restatements newest-wins, concept-keyed to survive duplicate labels). No PDFs, no API keys, no market-data vendor.
- Everything the pipeline generates is re-runnable Python persisted in the vault — updates re-execute scripts rather than regenerating code.

## Troubleshooting the unattended setup

- **`claude -p` returns 401:** your login attached to the Anthropic *Console* (API) account instead of your Claude *subscription* — re-run `claude login` and pick the subscription option. If invoking from inside another Claude session, inherited `ANTHROPIC_*`/`CLAUDE*` env vars override keychain auth (the runner scrubs them automatically).
- **Headless runs can't find `claude`:** the runner probes `~/.local/bin`, `~/bin`, `/opt/homebrew/bin`, `/usr/local/bin` and verifies the binary actually executes — `BAV_CLAUDE_BIN` overrides.
- **Nothing ran while the laptop was closed:** launchd skips scheduled runs while powered off; the agent also runs at load/login, and all triggers are durable — pending work survives to the next pass.
