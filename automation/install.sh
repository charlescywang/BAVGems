#!/bin/bash
# Install the BAV sentinel as a daily launchd agent (7:00 AM). Idempotent.
# Usage: bash automation/install.sh        Uninstall: launchctl bootout gui/$(id -u)/com.bav.sentinel
set -euo pipefail
TOOLS="$(cd "$(dirname "$0")" && pwd)"
# Vault (research) repo: first arg, or BAV_REPO, or the tool repo itself
REPO="${1:-${BAV_REPO:-$(cd "$TOOLS/.." && pwd)}}"
SECID="${BAV_SEC_IDENTITY:-Set Your Name you@example.com}"
PY="$(command -v python3)"
CLAUDE_BIN="$(command -v claude || true)"
if [ -z "$CLAUDE_BIN" ]; then
  echo "WARNING: 'claude' CLI not on PATH — headless runs will fail. Install/locate it first." >&2
fi
DEST="$HOME/Library/LaunchAgents/com.bav.sentinel.plist"
mkdir -p "$HOME/Library/LaunchAgents" "$REPO/coverage/_state"
# PATH covers every well-known claude install dir so installing the CLI AFTER
# this script still works (the runner also probes these dirs at runtime).
FULLPATH="$(dirname "$PY"):$HOME/.local/bin:$HOME/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
sed -e "s|__REPO__|$REPO|g" -e "s|__PYTHON__|$PY|g" \
    -e "s|__PATH__|$FULLPATH|g" -e "s|__HOME__|$HOME|g" -e "s|__TOOLS__|$TOOLS|g" -e "s|__SECID__|$SECID|g" \
    "$TOOLS/com.bav.sentinel.plist" > "$DEST"
if [ ! -d "$HOME/.claude-bav" ]; then
  echo "NOTE: automation auth home ~/.claude-bav not initialized yet. Run once:"
  echo "  CLAUDE_CONFIG_DIR=\$HOME/.claude-bav claude login   # pick the SUBSCRIPTION option"
fi
launchctl bootout "gui/$(id -u)/com.bav.sentinel" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$DEST"
echo "installed: com.bav.sentinel (daily 07:00) -> $DEST"
echo "vault: $REPO"
echo "manual run:   BAV_REPO=$REPO python3 $TOOLS/sentinel.py --dry-run"
echo "logs:         $REPO/coverage/_state/sentinel.log"
