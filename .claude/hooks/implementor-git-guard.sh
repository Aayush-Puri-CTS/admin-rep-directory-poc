#!/bin/bash
# .claude/hooks/implementor-git-guard.sh
#
# PreToolUse guard for the `implementor` subagent (see .claude/agents/implementor.md).
#
# Enforces the CIV separation at the permission layer, not just in the prompt:
# the Implementor writes code, the Verifier assesses it, and only the Coordinator
# commits — gated on a Verifier PASS. This hook blocks the Implementor from running
# any git command that would stage, commit, or alter repository state, so it cannot
# self-approve its own work by committing it.
#
# Read-only git inspection (status, diff, log, show) is allowed — the Implementor
# may look at the tree, it just can't change it.
#
# Wired via the `hooks:` block in .claude/agents/implementor.md (PreToolUse, matcher "Bash").
# Exit 2 blocks the tool call and feeds the stderr message back to the agent.

set -euo pipefail

INPUT="$(cat)"
COMMAND="$(echo "$INPUT" | jq -r '.tool_input.command // empty')"

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Block state-changing git subcommands. Word-boundary match on `git <verb>` so we
# don't trip on substrings (e.g. a filename containing "commit"). Case-insensitive.
if echo "$COMMAND" | grep -iEq '\bgit\s+(add|commit|restore|reset|rm|mv|stash|checkout|switch|branch|merge|rebase|cherry-pick|revert|push|tag|apply|clean)\b'; then
  echo "Blocked: the Implementor must never alter git state (staging, commits, branches, etc.). Committing verified work is the Coordinator's job, gated on a Verifier PASS. Report the task as done and let the Coordinator commit. Read-only git (status, diff, log, show) is allowed." >&2
  exit 2
fi

exit 0