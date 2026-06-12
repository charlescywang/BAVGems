#!/usr/bin/env python3
"""BAV sentinel — the deterministic daily pass that makes coverage continuous.

No LLM calls in this file. It detects, decides, and delegates. Core invariant
(from adversarial review): TRIGGERS ARE TRANSACTIONAL — detection adds work to a
persistent pending queue in state; an item is cleared only when its headless run
returns success. Failed, skipped, or cost-guard-deferred work survives to the
next pass. State writes are atomic; a corrupt state file quarantines + notifies
instead of killing every future pass.

Run modes:
  python3 automation/sentinel.py            # real pass (fires headless runs)
  python3 automation/sentinel.py --dry-run  # detect + print plan; fire nothing,
                                            # save nothing, notify nothing
Runner exit-code contract (bav_headless.py): 0 = ran ok · 2 = skipped (busy repo
/ lock timeout / nothing to do) · 1 = failed. Only 0 clears pending work.
"""
import argparse, datetime, fcntl, json, os, re, subprocess, sys, urllib.request

TOOLS = os.path.dirname(os.path.abspath(__file__))
# BAV_REPO points at the (possibly separate, private) research repo holding coverage/
REPO = os.environ.get('BAV_REPO') or os.path.dirname(TOOLS)
COVERAGE = os.path.join(REPO, 'coverage')
STATE_DIR = os.path.join(COVERAGE, '_state')          # gitignored
STATE_PATH = os.path.join(STATE_DIR, 'sentinel_state.json')
RUNNER = os.path.join(TOOLS, 'bav_headless.py')
UA = os.environ.get('BAV_SEC_IDENTITY', 'BAV sentinel contact@example.com')  # set your real contact per SEC policy
MATERIAL_FORMS = {'10-K', '10-Q', '10-K/A', '10-Q/A', '8-K'}
NEWS_INTERVAL_DAYS = 7
NAG_DAYS = 7
MAX_HEADLESS_RUNS_PER_PASS = 6      # cost guard; pending work persists to next pass
EDGAR_FAIL_NOTIFY_AT = 3            # consecutive poll failures before alarming

DRY = False


def log(msg):
    print(f'[sentinel {datetime.datetime.now():%H:%M:%S}] {msg}')


def notify(msg, title='BAV sentinel'):
    if DRY:
        log(f'(dry) NOTIFY: {msg}')
        return
    safe = msg.replace('\\', '').replace('"', "'")
    subprocess.run(['osascript', '-e',
                    f'display notification "{safe}" with title "{title}"'],
                   capture_output=True)
    log(f'NOTIFY: {msg}')


def load_state():
    if not os.path.exists(STATE_PATH):
        return {}
    try:
        return json.load(open(STATE_PATH))
    except (json.JSONDecodeError, OSError):
        quarantine = STATE_PATH + '.corrupt'
        os.replace(STATE_PATH, quarantine)
        notify(f'sentinel state was corrupt — quarantined to {os.path.basename(quarantine)}; starting fresh')
        return {}


def save_state(state):
    if DRY:
        return
    tmp = STATE_PATH + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(state, f, indent=1)
    os.replace(tmp, STATE_PATH)


def frontmatter(path):
    try:
        m = re.match(r'^---\n(.*?)\n---', open(path).read(), re.S)
    except OSError:
        return {}
    if not m:
        return {}
    return {k.strip(): v.strip().strip('"') for k, v in
            (line.split(':', 1) for line in m.group(1).splitlines() if ':' in line)}


def covered_tickers():
    out = []
    for name in sorted(os.listdir(COVERAGE)):
        d = os.path.join(COVERAGE, name)
        if name.startswith('_') or not os.path.isdir(d):
            continue
        fm = frontmatter(os.path.join(d, 'dossier.md'))
        if fm.get('ticker'):
            out.append(fm)
    return out


def edgar_recent_filings(cik):
    url = f'https://data.sec.gov/submissions/CIK{int(cik):010d}.json'
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    recent = data['filings']['recent']
    return [{'form': f, 'date': d, 'accession': a}
            for f, d, a in zip(recent['form'], recent['filingDate'],
                               recent['accessionNumber'])
            if f in MATERIAL_FORMS]


def pending_decision_ages(ticker):
    path = os.path.join(COVERAGE, ticker, 'pending_decisions.md')
    if not os.path.exists(path):
        return []
    ages = []
    for m in re.finditer(r'\[pending since (\d{4}-\d{2}-\d{2})\]', open(path).read()):
        try:
            ages.append((datetime.date.today()
                         - datetime.date.fromisoformat(m.group(1))).days)
        except ValueError:
            continue
    return ages


def artifact_mtimes(ticker):
    d = os.path.join(COVERAGE, ticker)
    times = {}
    for fname in os.listdir(d):
        if fname.endswith('.xlsx') and not fname.startswith('~$'):
            times['workbook'] = max(times.get('workbook', 0),
                                    os.path.getmtime(os.path.join(d, fname)))
    notes = os.path.join(d, 'notes.md')
    if os.path.exists(notes):
        times['notes'] = os.path.getmtime(notes)
    return times


def capture_mtimes(st, ticker):
    """Record current artifact mtimes as the baseline — call after our own runs
    so the system's writes don't re-trigger reconciliation (self-feedback loop)."""
    for key, mtime in artifact_mtimes(ticker).items():
        st[f'{key}_mtime'] = mtime


def detect(state, today, notices):
    """Phase 1: detection. Adds reasons to each ticker's persistent pending set."""
    for fm in covered_tickers():
        t = fm['ticker']
        st = state.setdefault(t, {})
        pend = st.setdefault('pending', {})
        rebuild_stub = fm.get('status') == 'needs-rebuild'

        # --- EDGAR poll: accession-set dedup is primary; the date floor only
        # bounds the first-ever observation (empty seen set).
        if fm.get('cik'):
            try:
                filings = edgar_recent_filings(fm['cik'])
                st['edgar_fails'] = 0
                seen = set(st.get('seen_accessions', []))
                if not seen:        # first observation: don't backfill history
                    floor = fm.get('last_update') or '1970-01-01'
                    fresh = [f for f in filings if f['date'] >= floor]
                else:
                    fresh = [f for f in filings if f['accession'] not in seen]
                if fresh:
                    forms = ', '.join(f"{f['form']} {f['date']}" for f in fresh[:4])
                    if rebuild_stub:
                        notices.append(f'{t}: new filings ({forms}) but position is '
                                       f'needs-rebuild — run /bav-pipeline {t} (no auto-run)')
                    else:
                        notices.append(f'{t}: new filings ({forms})')
                        pend.setdefault('update_reasons', []).append(f'filings: {forms}')
                # seen set always advances (dedup); the OBLIGATION lives in pending
                st['seen_accessions'] = (st.get('seen_accessions', [])
                                         + [f['accession'] for f in fresh])[-300:]
                if not seen:
                    st['seen_accessions'] = [f['accession'] for f in filings][-300:]
            except Exception as e:
                st['edgar_fails'] = st.get('edgar_fails', 0) + 1
                notices.append(f'{t}: EDGAR poll failed ({e}) — retry next pass')
                if st['edgar_fails'] == EDGAR_FAIL_NOTIFY_AT:
                    notify(f'{t}: EDGAR poll has failed {EDGAR_FAIL_NOTIFY_AT} passes running')

        # --- analyst-edit reconciliation (mtime baseline advances only here or
        # after our own successful runs)
        for key, mtime in artifact_mtimes(t).items():
            baseline = st.get(f'{key}_mtime')
            if baseline is None:
                st[f'{key}_mtime'] = mtime          # first observation
            elif mtime > baseline + 1 and not rebuild_stub:
                notices.append(f'{t}: {key} edited since last pass')
                pend.setdefault('update_reasons', []).append(f'{key} edited')
                st[f'{key}_mtime'] = mtime

        # --- weekly news sweep (dossier frontmatter and state are reconciled:
        # an interactive sweep updates the dossier; take the max of both)
        if not rebuild_stub:
            last = max(st.get('last_news_sweep', '1970-01-01'),
                       fm.get('last_news_sweep', '1970-01-01'))
            try:
                due = (today - datetime.date.fromisoformat(last)).days >= NEWS_INTERVAL_DAYS
            except ValueError:
                due = True
            pend['news_due'] = due

        # --- escalating nag on aged pending decisions
        stale = [a for a in pending_decision_ages(t) if a >= NAG_DAYS]
        if stale:
            notify(f'{t}: {len(stale)} pending decision(s) aged {max(stale)}d — run /bav-update {t}')


def execute(state, today):
    """Phase 2: run queued work, clearing pending only on success (rc==0)."""
    updates, sweeps = [], []
    for t, st in state.items():
        pend = st.get('pending', {})
        if pend.get('update_reasons'):
            updates.append(t)
        elif pend.get('news_due'):
            sweeps.append(t)
    jobs = [('prepare', t) for t in updates] + [('news', t) for t in sweeps]
    deferred = len(jobs) - MAX_HEADLESS_RUNS_PER_PASS
    jobs = jobs[:MAX_HEADLESS_RUNS_PER_PASS]
    log(f'plan: {jobs or "nothing to run"}'
        + (f' (+{deferred} deferred — pending survives to next pass)' if deferred > 0 else ''))
    if DRY:
        return True

    all_ok = True
    for mode, t in jobs:
        rc = subprocess.run([sys.executable, RUNNER, t, '--mode', mode], cwd=REPO).returncode
        st = state[t]
        if rc == 0:
            if mode == 'prepare':
                st['pending']['update_reasons'] = []
            else:
                st['pending']['news_due'] = False
                st['last_news_sweep'] = today.isoformat()
            capture_mtimes(st, t)       # our own writes must not re-trigger
        elif rc != 2:                   # 2 = skipped: keep pending, no alarm here
            all_ok = False
        save_state(state)               # incremental — survive a crash mid-pass

    if today.weekday() == 0:            # Monday brief (runner saves output to _state/)
        subprocess.run([sys.executable, RUNNER, '--mode', 'brief'], cwd=REPO)
    return all_ok


def finish(notices):
    if DRY:
        return
    subprocess.run([sys.executable,
                    os.path.join(TOOLS, 'build_dashboard.py')], cwd=REPO)
    # dashboard is a committed view (phone-readable); push it even on quiet days
    subprocess.run(['git', '-C', REPO, 'add', 'coverage/dashboard.html'], capture_output=True)
    if subprocess.run(['git', '-C', REPO, 'diff', '--cached', '--quiet'],
                      capture_output=True).returncode != 0:
        subprocess.run(['git', '-C', REPO, 'commit', '-m',
                        f'bav: dashboard {datetime.date.today().isoformat()}'],
                       capture_output=True)
        subprocess.run(['git', '-C', REPO, 'push'], capture_output=True)
    with open(os.path.join(STATE_DIR, 'heartbeat'), 'w') as f:    # sentinel owns liveness
        f.write(datetime.datetime.now().isoformat(timespec='seconds'))
    if notices:
        notify('; '.join(notices[:3]))


def main():
    global DRY
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--force', action='store_true',
                    help='allow running from inside a Claude session')
    args = ap.parse_args()
    DRY = args.dry_run
    if os.environ.get('CLAUDECODE') and not (args.force or DRY):
        # a headless skill run must never recursively start the cadence
        log('refusing: invoked from inside a Claude session (use --force)')
        return 2

    os.makedirs(STATE_DIR, exist_ok=True)
    with open(os.path.join(STATE_DIR, 'sentinel.lock'), 'w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            log('another sentinel pass is running — exiting')
            return 2

        state = load_state()
        notices = []
        today = datetime.date.today()
        detect(state, today, notices)
        for msg in notices:
            log(msg)
        save_state(state)               # pending work is durable before any run fires
        ok = execute(state, today)
        save_state(state)
        finish(notices)
        if DRY:
            log('dry-run: nothing fired, nothing saved, nothing notified')
        return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
