#!/usr/bin/env bash
# ============================================================
# ArxMint — Generate Production Secrets
# Creates cryptographically secure secrets for .env
# ============================================================

set -euo pipefail

FORCE=false
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

# Parse flags
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    *) echo "Unknown argument: $arg"; echo "Usage: $0 [--force]"; exit 1 ;;
  esac
done

echo "========================================"
echo " ArxMint — Generate Production Secrets"
echo " Financial privacy as a human right."
echo "========================================"
echo ""

# Check openssl
if ! command -v openssl &> /dev/null; then
  echo "ERROR: openssl is not installed. Install it first."
  echo "  Ubuntu/Debian: sudo apt install openssl"
  echo "  macOS:         brew install openssl"
  exit 1
fi

# Safety check: warn if .env already exists
if [ -f "$ENV_FILE" ] && [ "$FORCE" = false ]; then
  echo "WARNING: $ENV_FILE already exists."
  echo ""
  echo "Running this script will UPDATE the four generated secrets:"
  echo "  NEXTAUTH_SECRET, MACAROON_ROOT_KEY, CASHU_PRIVATE_KEY, GRAFANA_PASSWORD"
  echo ""
  echo "Other values in $ENV_FILE will NOT be changed."
  echo ""
  printf "Continue? [y/N] "
  read -r REPLY
  echo ""
  if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
    echo "Aborted. Run with --force to skip this prompt."
    exit 0
  fi
fi

echo "Generating secrets..."
echo ""

# Generate secrets — never echoed in full
NEXTAUTH_SECRET=$(openssl rand -base64 32)
MACAROON_ROOT_KEY=$(openssl rand -hex 32)
CASHU_PRIVATE_KEY=$(openssl rand -hex 32)
GRAFANA_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)

# Helper: mask a value (show first 4 chars then ****)
mask() {
  local val="$1"
  echo "${val:0:4}****"
}

# Helper: upsert a KEY=VALUE line in a file
# If KEY= exists (with empty or any value), replace it; otherwise append
upsert_env() {
  local key="$1"
  local value="$2"
  local file="$3"

  # Escape value for sed replacement (handle / and & characters)
  local escaped_value
  escaped_value=$(printf '%s\n' "$value" | sed 's/[\/&]/\\&/g')

  if grep -qE "^${key}=" "$file" 2>/dev/null; then
    # Key exists — replace the line
    sed -i.bak "s|^${key}=.*|${key}=${escaped_value}|" "$file"
    rm -f "${file}.bak"
  else
    # Key not found — append it
    echo "${key}=${escaped_value}" >> "$file"
  fi
}

# If .env doesn't exist, seed from .env.example
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    echo "Creating $ENV_FILE from $ENV_EXAMPLE..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
  else
    echo "Creating new $ENV_FILE..."
    touch "$ENV_FILE"
  fi
fi

# Write generated secrets into .env
upsert_env "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET" "$ENV_FILE"
upsert_env "MACAROON_ROOT_KEY" "$MACAROON_ROOT_KEY" "$ENV_FILE"
upsert_env "CASHU_PRIVATE_KEY" "$CASHU_PRIVATE_KEY" "$ENV_FILE"
upsert_env "GRAFANA_PASSWORD" "$GRAFANA_PASSWORD" "$ENV_FILE"

echo "========================================"
echo " Secrets written to $ENV_FILE"
echo "========================================"
echo ""
echo "  NEXTAUTH_SECRET  = $(mask "$NEXTAUTH_SECRET")"
echo "  MACAROON_ROOT_KEY = $(mask "$MACAROON_ROOT_KEY")"
echo "  CASHU_PRIVATE_KEY = $(mask "$CASHU_PRIVATE_KEY")"
echo "  GRAFANA_PASSWORD  = $(mask "$GRAFANA_PASSWORD")"
echo ""
echo "========================================"
echo " IMPORTANT — Read before continuing"
echo "========================================"
echo ""
echo "  1. Save these secrets securely."
echo "     Losing NEXTAUTH_SECRET invalidates all user sessions."
echo "     Losing CASHU_PRIVATE_KEY means wallet recovery is impossible."
echo ""
echo "  2. Back up .env to an offline location"
echo "     (encrypted USB, password manager, or printed and secured)."
echo ""
echo "  3. NEVER commit .env to version control."
echo "     Verify .env is in your .gitignore."
echo ""
echo "  4. LND_SEED must be generated separately:"
echo "     After the stack is running, run:"
echo "       docker exec sf-lnd lncli create"
echo ""
echo "========================================"
echo ""
