---
name: bav-news
description: "Uncertainty-keyed media sweep for a covered ticker: searches news and media specifically against the dossier's key uncertainties and KPI watchlist, classifies findings as load-bearing vs. context vs. noise, and routes material findings into the coverage loop (journal entry; proposals to pending_decisions.md in unattended runs). Use when the user asks to check the news on a covered name, scan media for thesis-relevant information, or when the sentinel schedules the weekly sweep. Read-mostly: never edits model vectors directly — news moves probabilities, watchlist currents, and open questions through the normal gates."
---

# BAV News — Uncertainty-Keyed Media Sweep

A media sweep is only as good as the question it asks. "Anything new about {TICKER}?" drowns in noise; this skill queries the news **by the dossier**: every Key Uncertainty and every KPI watchlist row is a standing question, and the sweep's job is to find new evidence on exactly those questions since the last sweep.

Requires `coverage/{TICKER}/` with a dossier. Honors the write-authority contract in `coverage/_conventions.md` and the run modes (interactive / `--prepare`).

## Procedure

### 1. Load the question set
Read dossier.md (thesis, **Key uncertainties → scenarios**, **KPI watchlist**, open questions), notes.md (new analyst entries are extra questions), and the last journal entry's date (or the sentinel's last sweep date) as the search floor.

### 2. Sweep — one targeted pass per question, plus one general pass
- For each key uncertainty and each watchlist row: a WebSearch phrased as that question with a recency qualifier (e.g. "{COMPANY} segment backlog growth Q2 2026", "{COMPANY} antitrust appeal ruling June 2026").
- For each item in open questions that is verifiable from public news (e.g. "did the court ruling land?"): a direct check.
- One general pass: "{COMPANY} news {month year}" to catch material items the dossier didn't anticipate (management changes, M&A, guidance revisions, major product events).
- Current price as of today (note it; do not write marketData without a model run).
- De-emphasize social/X chatter: it is sentiment, not load-bearing fact; material claims must trace to a primary source (filing, court docket, company statement, reputable outlet).

### 3. Classify every finding — three buckets
1. **Trigger-tripping:** touches a watchlist threshold (e.g. segment growth printed below the bear trigger). Strongest class — cite the watchlist row.
2. **Load-bearing:** changes the mechanism or probability of a scenario story even though no threshold tripped (e.g. a structural court ruling landed; a credible competitor deal; guidance cut). State WHICH scenario assumption it bears on.
3. **Context/noise:** everything else. Listed in one compact line or dropped; never generates proposals.

### 4. Route per the write-authority contract
Everything a sweep produces is **Class B (system-initiated)**:
- **Interactive:** present trigger-tripping + load-bearing findings; gate any proposed changes (watchlist `current`/`asOf` updates, probability shifts, new open questions) via AskUserQuestion; apply what's confirmed (snapshot-first if assumptions.json is touched).
- **`--prepare` (sentinel):** write proposals to `coverage/{TICKER}/pending_decisions.md` ("[pending since {date}]" format per `references/automation.md` in bav-pipeline) and notify. NEVER touch assumptions.json.
- Either mode: append a journal entry — `## {date} — Media sweep`: findings by bucket with source links, explicit "no material findings" when true (that IS the finding), and the price noted. Update dossier frontmatter `last_news_sweep: {date}`.

## Epistemic guards
- **News never edits vectors.** Growth/margin/intensity vectors move on filings and results via bav-update. News legitimately moves: probabilities (proposed), watchlist currents, open questions, Bear/Bull mechanism descriptions.
- **Materiality threshold:** a proposal needs a primary-sourced fact that maps to a named assumption. "Analysts are bullish" is noise.
- **No thrash:** one consolidated sweep per cadence window; if the same story recurs across sweeps without new facts, reference the prior journal entry instead of re-proposing.
- Findings must carry source URLs in the journal entry — unverifiable claims get flagged as such or dropped.
