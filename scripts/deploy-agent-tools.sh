#!/usr/bin/env bash
# ============================================================
# ArxMint — Lightning Agent Tools Deployment
# Installs and configures the Lightning Agent Kit for AI agents
# https://github.com/lightninglabs/lightning-agent-tools
# ============================================================

set -euo pipefail

echo "========================================"
echo " ArxMint — Agent Tools Setup"
echo " Censorship-resistant rails for agents."
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Install Node.js 18+."
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js 18+ required (found v$NODE_VERSION)"
    exit 1
fi

echo "Node.js: $(node -v)"
echo "npm:     $(npm -v)"
echo ""

# === 1. Install Lightning MCP Server ===
echo "[1/3] Installing Lightning MCP Server..."
echo "  Package: @lightninglabs/lightning-mcp-server"
npx -y @lightninglabs/lightning-mcp-server --version 2>/dev/null || echo "  (will install on first run)"
echo "  Done."
echo ""

# === 2. Install LNC Web (for browser integration) ===
echo "[2/3] Checking @lightninglabs/lnc-web..."
if npm list @lightninglabs/lnc-web 2>/dev/null | grep -q lnc-web; then
    echo "  Already installed."
else
    echo "  Install via: npm install @lightninglabs/lnc-web"
fi
echo ""

# === 3. Configure MCP ===
echo "[3/3] MCP Configuration..."
if [ -f ".mcp.json" ]; then
    echo "  .mcp.json already exists."
else
    cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "lightning": {
      "command": "npx",
      "args": ["-y", "@lightninglabs/lightning-mcp-server"],
      "transportType": "stdio",
      "env": {
        "LNC_MAILBOX_SERVER": "mailbox.terminal.lightning.today:443"
      }
    }
  }
}
EOF
    echo "  Created .mcp.json"
fi
echo ""

# === Summary ===
echo "========================================"
echo " Agent Tools Ready!"
echo ""
echo " MCP Server: npx @lightninglabs/lightning-mcp-server"
echo " Add to Claude Code:"
echo "   claude mcp add --transport stdio lnc -- npx -y @lightninglabs/lightning-mcp-server"
echo ""
echo " 18 tools available (read-only):"
echo "   lnc_connect, lnc_get_info, lnc_get_balance,"
echo "   lnc_list_channels, lnc_decode_invoice, etc."
echo ""
echo " 7 skills:"
echo "   lnd, lightning-security-module, macaroon-bakery,"
echo "   lnget, aperture, lightning-mcp-server, commerce"
echo ""
echo " L402 client (lnget):"
echo "   lnget https://api.example.com/premium-data.json"
echo "   lnget --max-cost 500 https://api.example.com/data"
echo "========================================"
