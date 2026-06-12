# Automation punch list — deferred adversarial-review findings

From the 2026-06-11 three-lens review (92 findings; full output archived in the session
transcript). The critical/high set was fixed the same day (transactional pending queue,
probed claude resolution, atomic/guarded state, accession-primary filing dedup, runner
exit-code contract, needs-rebuild guard, self-trigger mtime capture, launchd PATH,
gitignored `_state/`, dashboard commit + robustness, brief output capture, nag/dry-run
behavior, doc-consistency fixes). Deferred, in rough priority order:

1. **Headless `claude -p` invocation is UNVERIFIED end-to-end** — flags (`--settings`,
   `--permission-mode`), plugin-skill resolution in `-p` mode, and keychain auth from a
   launchd context. MUST smoke-test after the CLI is installed, before trusting the cadence:
   `python3 automation/bav_headless.py GOOGL --mode news` while watching sentinel.log.
2. **Cost control is run-count only** (≤6 runs/pass) — no token/turn budget per run.
   Consider `--max-turns` or a task budget once real costs are observed.
3. **osascript notifications from launchd** may be suppressed by Focus modes or TCC
   permission — verify one fires on day one; consider an email/ntfy fallback channel.
4. **`git add coverage/`** sweeps any in-progress analyst edits and failed-run debris
   into bot commits. Mitigated by gitignore (`_state/`, `~$*`) but not eliminated;
   consider per-run `git status` diff reporting in the commit body.
5. **No remote-divergence handling** — push assumes fast-forward; a remote-side commit
   (e.g. editing on another machine) wedges pushes until manual pull. Add
   fetch + ff-only pull before push, skip-and-notify on divergence.
6. **launchd missed runs**: StartCalendarInterval skips runs while powered off;
   RunAtLoad now covers boot/login, but a laptop asleep at 07:00 that never
   reboots can still miss a day. Consider StartInterval as a belt-and-suspenders.
7. **Branch/identity guards**: runner doesn't check current branch (commits land
   wherever HEAD is) or git identity/signing availability in launchd context.
8. **seen_accessions eviction** is append-order (fine in practice, 300 deep) — revisit
   if coverage grows past ~50 names with frequent 8-K filers.
9. **Monday brief bypasses the run-count guard** (one extra run/week, by design — note only).
10. **Workbook NOTES tab** (from the Excel-native design) not implemented — analyst notes
    currently require editing notes.md (Obsidian) directly; revisit if friction shows.
11. **Log rotation**: sentinel.log grows unbounded (gitignored, but disk) — newsyslog or
    truncate-at-size in the sentinel.
12. **bav-news `--auto` behavior undefined** (only interactive and `--prepare` specified) —
    define if ever needed; currently nothing invokes it.
