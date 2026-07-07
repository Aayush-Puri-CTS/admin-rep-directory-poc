#!/bin/bash
# .claude/hooks/verify-loop.sh
#
# Implements the "Loop Engineering" verification loop from the AI SDLC framework (§4):
# after Claude writes/edits a file, lint + relevant tests run automatically. Failures are
# fed back to Claude as a blocking decision so it self-corrects in the same turn. After
# LOOP_BUDGET consecutive failures on the same file, the hook stops blocking and instead
# flags the change for human review — CI failing twice after passing local checks is
# treated as "local verification is insufficient," not a reason to keep looping.
#
# Wired up in .claude/settings.json under hooks.PostToolUse (matcher: "Write|Edit").
#
# Adjust LINT_CMD / TEST_CMD below to match this repo's actual package.json scripts if they
# ever diverge from CLAUDE.md's "Tech stack & commands" section — these should always match
# that section exactly.

set -euo pipefail

LOOP_BUDGET=3
LINT_CMD=(pnpm exec eslint)
TEST_CMD=(pnpm exec jest)

INPUT="$(cat)"

FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')"
SESSION_ID="$(echo "$INPUT" | jq -r '.session_id // "unknown"')"

# Only verify TypeScript source under src/ — skip prisma schema, config, markdown, etc.
# (Prisma schema changes are Tier C and go through `pnpm exec prisma validate` manually / in
# CI, not this loop — schema errors are usually structural, not the kind of thing that
# benefits from a 3x auto-retry.)
if [[ -z "$FILE_PATH" || "$FILE_PATH" != *"/src/"* || "$FILE_PATH" != *.ts ]]; then
  exit 0
fi
if [[ "$FILE_PATH" == *.spec.ts || "$FILE_PATH" == *.test.ts ]]; then
  # Editing a test file directly — still lint it, but don't try to find "a test for the test"
  RUN_TESTS=false
else
  RUN_TESTS=true
fi

STATE_DIR="${CLAUDE_PROJECT_DIR}/.claude/hooks/.state"
mkdir -p "$STATE_DIR"
STATE_KEY="$(echo -n "${SESSION_ID}:${FILE_PATH}" | md5sum | cut -d' ' -f1)"
STATE_FILE="${STATE_DIR}/${STATE_KEY}"

FAILURES=""

LINT_OUTPUT="$("${LINT_CMD[@]}" "$FILE_PATH" 2>&1)" && LINT_STATUS=0 || LINT_STATUS=$?
if [[ "$LINT_STATUS" -ne 0 ]]; then
  FAILURES="${FAILURES}## Lint failures (${FILE_PATH})
${LINT_OUTPUT}

"
fi

if [[ "$RUN_TESTS" == true ]]; then
  # Look for a co-located spec file — adjust this glob if this repo uses a different
  # test-file convention (e.g. tests mirrored under a top-level __tests__ tree).
  BASE="${FILE_PATH%.ts}"
  SPEC_FILE=""
  for candidate in "${BASE}.spec.ts" "${BASE}.test.ts"; do
    if [[ -f "$candidate" ]]; then
      SPEC_FILE="$candidate"
      break
    fi
  done

  if [[ -n "$SPEC_FILE" ]]; then
    TEST_OUTPUT="$("${TEST_CMD[@]}" "$SPEC_FILE" --silent 2>&1)" && TEST_STATUS=0 || TEST_STATUS=$?
    if [[ "$TEST_STATUS" -ne 0 ]]; then
      FAILURES="${FAILURES}## Test failures (${SPEC_FILE})
${TEST_OUTPUT}

"
    fi
  fi
fi

if [[ -z "$FAILURES" ]]; then
  # Clean pass — reset the loop counter for this file/session.
  rm -f "$STATE_FILE"
  exit 0
fi

# There are failures. Increment the loop counter.
ATTEMPT=1
if [[ -f "$STATE_FILE" ]]; then
  ATTEMPT=$(( $(cat "$STATE_FILE") + 1 ))
fi
echo "$ATTEMPT" > "$STATE_FILE"

# Truncate to keep the payload well under the 10,000-character hook output cap.
TRUNCATED="$(echo "$FAILURES" | head -c 4000)"

if [[ "$ATTEMPT" -le "$LOOP_BUDGET" ]]; then
  # Still within budget: block and hand the errors back to Claude to self-correct.
  jq -n \
    --arg reason "Self-correction cycle ${ATTEMPT}/${LOOP_BUDGET} for ${FILE_PATH}:

${TRUNCATED}

Fix the reported issues before moving on." \
    '{decision: "block", reason: $reason}'
else
  # Budget exhausted: stop auto-looping and escalate instead of retrying indefinitely.
  rm -f "$STATE_FILE"
  jq -n \
    --arg ctx "Escalation: ${FILE_PATH} failed local verification ${LOOP_BUDGET} times in a row. Per the AI SDLC loop budget, this now needs a human rather than another automatic retry. Summarize the remaining issue for the developer instead of attempting another fix." \
    --arg msg "Loop budget exceeded on ${FILE_PATH} — flagged for human review." \
    '{
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: $ctx
      },
      systemMessage: $msg
    }'
fi