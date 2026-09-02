#!/usr/bin/env bash
# code-review-graph: session start status (Gemini CLI hook)
# Must output ONLY JSON on stdout. Logs go to stderr. Never blocks the session.
set -euo pipefail

cat > /dev/null || true   # drain the hook's stdin payload

# Hooks run inside the workspace; resolve the repo from there instead of hardcoding it.
repo="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
msg="$(code-review-graph status --repo "$repo" 2>&1 | head -n 1 || true)"

CRG_MSG="$msg" python3 -c '
import json, os
print(json.dumps({"systemMessage": os.environ.get("CRG_MSG", ""), "suppressOutput": True}))
' 2>/dev/null || echo '{"suppressOutput": true}'
exit 0
