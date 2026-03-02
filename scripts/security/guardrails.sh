#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: guardrails.sh [--scope staged|tracked] [--mode off|observe|enforce]

Modes:
  off      Skip checks
  observe  Log findings but do not fail (default)
  enforce  Fail on findings

Env overrides:
  ARXMINT_GUARDRAIL_MODE           Preferred mode for local hooks
  ARXMINT_SECURITY_GATE_MODE       Preferred mode for CI
  ARXMINT_SECURITY_CANARY_BRANCHES Comma-separated branch names forced to enforce
EOF
}

SCOPE="staged"
MODE_ARG=""
EXPLICIT_MODE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope)
      SCOPE="${2:-}"
      shift 2
      ;;
    --mode)
      MODE_ARG="${2:-}"
      EXPLICIT_MODE=1
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[guardrails] unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

normalize_mode() {
  local raw
  raw="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  case "$raw" in
    ""|observe) echo "observe" ;;
    off|enforce) echo "$raw" ;;
    *)
      echo "[guardrails] invalid mode '$1' - falling back to observe" >&2
      echo "observe"
      ;;
  esac
}

if [[ "$EXPLICIT_MODE" -eq 1 ]]; then
  MODE="$(normalize_mode "$MODE_ARG")"
else
  MODE="$(normalize_mode "${ARXMINT_GUARDRAIL_MODE:-${ARXMINT_SECURITY_GATE_MODE:-observe}}")"
fi

if [[ "$SCOPE" != "staged" && "$SCOPE" != "tracked" ]]; then
  echo "[guardrails] invalid scope '$SCOPE' - expected staged or tracked" >&2
  exit 2
fi

current_branch() {
  if [[ -n "${GITHUB_REF_NAME:-}" ]]; then
    printf '%s' "$GITHUB_REF_NAME"
    return
  fi
  git rev-parse --abbrev-ref HEAD 2>/dev/null || printf ''
}

is_canary_branch() {
  local branch list entry
  branch="$(current_branch)"
  list="${ARXMINT_SECURITY_CANARY_BRANCHES:-}"
  if [[ -z "$branch" || -z "$list" ]]; then
    return 1
  fi
  IFS=',' read -r -a _entries <<< "$list"
  for entry in "${_entries[@]}"; do
    entry="$(printf '%s' "$entry" | xargs)"
    if [[ -n "$entry" && "$entry" == "$branch" ]]; then
      return 0
    fi
  done
  return 1
}

if [[ "$EXPLICIT_MODE" -eq 0 && "$MODE" == "observe" ]] && is_canary_branch; then
  MODE="enforce"
fi

if [[ "$MODE" == "off" ]]; then
  echo "[guardrails] mode=off scope=$SCOPE - skipped"
  exit 0
fi

RUNTIME_PATH_PATTERN='(^|/)\.overnight/|(^|/)worker_[0-9]{3}.*\.bat$|(^|/)round_[0-9]+_.*\.(bat|sh)$|(^|/)_wezterm_spawn_.*\.bat$'
SECRET_PATTERN='sk-ant-oat01|sk-ant-ort01|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|CLAUDE_CODE_OAUTH_TOKEN[[:space:]]*[:=][[:space:]]*[A-Za-z0-9._-]+'

collect_paths() {
  if [[ "$SCOPE" == "staged" ]]; then
    git diff --cached --name-only --diff-filter=ACMR -- .
  else
    git ls-files
  fi
}

PATH_HITS=""
SECRET_HITS=""

PATH_HITS="$(collect_paths | grep -E "$RUNTIME_PATH_PATTERN" || true)"

if [[ "$SCOPE" == "staged" ]]; then
  SECRET_HITS="$(
    git diff --cached -U0 --no-color -- . \
      ':(exclude).githooks/pre-commit' \
      ':(exclude)scripts/security/guardrails.sh' \
    | grep -En "^\+[^+].*(${SECRET_PATTERN})" || true
  )"
fi

FINDINGS=0
if [[ -n "$PATH_HITS" ]]; then
  FINDINGS=$((FINDINGS + 1))
fi
if [[ -n "$SECRET_HITS" ]]; then
  FINDINGS=$((FINDINGS + 1))
fi

if [[ "$FINDINGS" -eq 0 ]]; then
  echo "[guardrails] mode=$MODE scope=$SCOPE - no findings"
  exit 0
fi

echo "[guardrails] mode=$MODE scope=$SCOPE - findings detected"

if [[ -n "$PATH_HITS" ]]; then
  echo "[guardrails] Runtime artifact paths should not be committed:"
  printf '%s\n' "$PATH_HITS"
fi

if [[ -n "$SECRET_HITS" ]]; then
  echo "[guardrails] Secret-like tokens found in staged additions:"
  printf '%s\n' "$SECRET_HITS"
fi

if [[ "$MODE" == "enforce" ]]; then
  echo "[guardrails] enforce mode - blocking."
  exit 1
fi

echo "[guardrails] observe mode - continuing."
exit 0
