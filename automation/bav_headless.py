#!/usr/bin/env python3
"""Serialized, lock-protected headless BAV runner.

Exit-code contract (the sentinel depends on it):
  0 = work ran successfully        (sentinel clears pending / stamps sweeps)
  2 = skipped (busy repo, lock timeout, nothing to do)   (pending survives)
  1 = failed                        (pending survives; notification fired)

Other guarantees: one repo-level fcntl lock, sequential tickers, commits scoped
to coverage/, single push per pass, all git/exec failures notify rather than
crash. The claude binary is PROBED (--version) before use — an unrunnable
binary (e.g. the desktop app's Linux VM build) is never selected. Liveness
heartbeat is owned by sentinel.py, not this runner.
"""
import argparse, datetime, fcntl, os, shutil, subprocess, sys, time

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPO = os.environ.get('BAV_REPO') or os.path.dirname(TOOLS)   # the research/vault repo
STATE = os.path.join(REPO, 'coverage', '_state')
LOCK_PATH = os.path.join(STATE, 'run.lock')
SETTINGS = os.path.join(TOOLS, 'headless_settings.json')
LOCK_TIMEOUT_S = 3 * 3600


def notify(msg, title='BAV runner'):
    safe = msg.replace('\\', '').replace('"', "'")
    subprocess.run(['osascript', '-e',
                    f'display notification "{safe}" with title "{title}"'],
                   capture_output=True)
    print(f'[notify] {title}: {msg}')


def _runnable(path):
    if not (path and os.path.isfile(path) and os.access(path, os.X_OK)):
        return False
    try:
        return subprocess.run([path, '--version'], capture_output=True,
                              timeout=20).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False        # includes exec-format-error (Linux VM build)


def find_claude():
    """env override > PATH > well-known install dirs — every candidate PROBED."""
    candidates = [os.environ.get('BAV_CLAUDE_BIN'), shutil.which('claude')]
    candidates += [os.path.expanduser(p) for p in
                   ('~/.local/bin/claude', '~/bin/claude',
                    '/opt/homebrew/bin/claude', '/usr/local/bin/claude')]
    for c in candidates:
        if _runnable(c):
            return c
    raise FileNotFoundError(
        'no working claude CLI found — install the standalone CLI '
        '(https://claude.ai/install.sh) and/or set BAV_CLAUDE_BIN')


def git(*args):
    r = subprocess.run(['git', '-C', REPO, *args], capture_output=True, text=True)
    if r.returncode != 0 and args[0] not in ('diff',):
        notify(f'git {args[0]} failed: {r.stderr.strip()[:110]}')
    return r


def repo_busy():
    gitdir = os.path.join(REPO, '.git')
    return any(os.path.exists(os.path.join(gitdir, p))
               for p in ('rebase-merge', 'rebase-apply', 'MERGE_HEAD',
                         'CHERRY_PICK_HEAD', 'index.lock'))


def run_job(ticker, mode):
    prompt = {'brief': '/bav-brief',
              'news': f'/bav-news {ticker} --prepare',
              'prepare': f'/bav-update {ticker} --prepare'}[mode]
    label = 'brief' if mode == 'brief' else ticker
    print(f'--- headless run: {prompt}')
    # Scrub inherited ANTHROPIC_*/CLAUDE* vars: when this runner is invoked from
    # inside a Claude session, leaked session env overrides keychain auth (401).
    # launchd env is clean anyway; this makes manual testing behave identically.
    clean_env = {k: v for k, v in os.environ.items()
                 if not (k.startswith('ANTHROPIC') or k.startswith('CLAUDE')
                         or k in ('BAGGAGE', 'AI_AGENT'))}
    # Optional isolated auth home: if ~/.claude-bav exists (one-time setup:
    # CLAUDE_CONFIG_DIR=~/.claude-bav claude login, SUBSCRIPTION option), use it —
    # immune to the desktop app sharing the default keychain slot. Otherwise the
    # CLI's default (subscription) auth is used.
    bav_home = os.environ.get('BAV_CLAUDE_CONFIG', os.path.expanduser('~/.claude-bav'))
    if os.path.isdir(bav_home):
        clean_env['CLAUDE_CONFIG_DIR'] = bav_home
    try:
        r = subprocess.run(
            [find_claude(), '-p', prompt, '--settings', SETTINGS,
             '--permission-mode', 'acceptEdits'],
            cwd=REPO, env=clean_env, capture_output=True, text=True, timeout=3600)
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as e:
        notify(f'{label}: headless run FAILED ({type(e).__name__}: {str(e)[:90]})')
        return False
    if r.returncode != 0:
        notify(f'{label}: headless run FAILED (rc={r.returncode}) — see sentinel.log')
        # claude CLI failures often land on stdout with empty stderr —
        # capture both or the diagnosis is lost (2026-06-12 smoke test)
        print(f'[runner] rc={r.returncode} stderr tail:\n{r.stderr[-2000:]}')
        print(f'[runner] stdout tail:\n{r.stdout[-2000:]}')
        return False
    if mode == 'brief':     # the brief's product must land somewhere durable
        with open(os.path.join(STATE, 'last_brief.md'), 'w') as f:
            f.write(f'# Headless brief — {datetime.datetime.now():%Y-%m-%d %H:%M}\n\n'
                    + r.stdout)
        notify('weekly brief saved to coverage/_state/last_brief.md')
    git('add', 'coverage/')
    if git('diff', '--cached', '--quiet').returncode != 0:
        git('commit', '-m',
            f'bav: unattended {mode} {label} {datetime.date.today().isoformat()}')
    return True


def main():
    p = argparse.ArgumentParser()
    p.add_argument('tickers', nargs='*')
    p.add_argument('--mode', choices=['prepare', 'brief', 'news'], default='prepare')
    args = p.parse_args()
    if os.environ.get('CLAUDECODE'):
        # never spawn claude from inside claude (recursion; nested auth breaks)
        print('refusing: invoked from inside a Claude session')
        return 2
    jobs = ['brief'] if args.mode == 'brief' else args.tickers
    if not jobs:
        print('nothing to run')
        return 2

    os.makedirs(STATE, exist_ok=True)
    with open(LOCK_PATH, 'w') as lock:
        deadline = time.time() + LOCK_TIMEOUT_S
        while True:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.time() > deadline:
                    notify('lock wait exceeded 3h — a run is wedged; skipping')
                    return 2
                time.sleep(30)

        if repo_busy():
            notify('repo is mid-merge/rebase (or index locked) — run skipped')
            return 2

        ok = True
        for t in jobs:
            ok = run_job(t, args.mode) and ok
        git('push')
        return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
