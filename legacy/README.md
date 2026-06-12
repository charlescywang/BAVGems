# Legacy — the original "custom GPT" system (Gemini Gems)

Before this repository was a Claude Code skill, it was four instruction sets run by hand as **Gemini Gems** — the custom-GPT pattern, anchored on Google's ecosystem:

- **Gemini Gems** held the personas (paste an instruction file into a Gem — or an OpenAI custom GPT — and it becomes that specialist);
- **NotebookLM** provided grounding: upload the 10-Ks, analyst reports, and transcripts, and the Strategist's report cites real filings instead of model memory;
- **Google Sheets + Apps Script** was the modeling surface: the Analyst and Modeler Gems emit `.gs` scripts that build the workbook tabs programmatically, formula-linked end to end.

## The files

| File | Role |
|---|---|
| `1. The Strategist Gem Instructions.md` | Strategy report with quantified factors and the Bull/Base/Bear scenario framework — the model's input, never its output |
| `2. The Assembler Gem Instructions.md` | 10-K filings → clean IS/BS/CF tabs: superset schema, restatement priority (newest filing wins), sign conventions, checksums |
| `3. The Analyst Gem Instructions.md` | Generates the Apps Script that builds Condensed Financials (operating vs. financial classification) and ALT DuPont — no hardcoded values, every cell traces to a source tab |
| `4. The Modeler (Multi Scenario) Gem Instructions.md` | Three-scenario residual income model: customizes only `getScenarioConfigs()` in the reference script; writes differentiated Professor's Notes |
| `4Alt. The Modeler Gem Instructions.md` | Single-scenario variant of the Modeler |
| `Sample AppScript for Condensed and Dupont*.txt` | Reference Apps Script implementations for the Analyst's output |

The authoritative reference `.gs` scripts the Modeler customizes (`Reference_Parameterized_Model.gs`, `MultiScenario_Parameterized_Model.gs`) live in `../skills/bav-pipeline/references/` — they remain the canonical definition of the Google Sheets model-tab layout, and the skill will still emit a customized `.gs` if you ask for Google Sheets output.

## The manual workflow

1. Ground NotebookLM with the company's filings; run **Strategist** → strategy report.
2. Give **Assembler** the 10-K PDFs → paste its output structure into Sheets (or run its build steps).
3. Run **Analyst** → paste the generated Apps Script into Extensions → Apps Script → run → Condensed + DuPont tabs appear.
4. Give **Modeler** the strategy report + workbook → it returns `getScenarioConfigs()` → paste into the reference script → run → three model tabs + scenario summary.

Each handoff is manual; each output is a one-shot artifact. That friction is precisely what the Claude Code skill in this repository automates — staged subagents, file contracts, a persistent coverage vault, and a daily sentinel. See the root [README](../README.md#lineage--from-custom-gpts-gemini-gems-to-a-claude-code-skill) for the full story.
