#!/bin/bash
# educreds_trust_agent/diagnose-and-fix-401.sh
# Diagnoses and fixes the 401 Unauthorized error in production

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=================================================="
echo "Trust Agent 401 Unauthorized Diagnostic & Fix"
echo "=================================================="
echo ""

# Step 1: Check .env file
echo "Step 1: Checking .env configuration..."
if [ ! -f ".env" ]; then
    log_error ".env file not found!"
    log_warn "Creating .env from .env.fixed template..."
    cp .env.fixed .env
    log_info ".env created from template - PLEASE UPDATE WITH VALID API KEY"
fi

# Step 2: Read environment variables
log_info ".env file exists"
PROVIDER=$(grep "TRUST_AGENT_LLM_PROVIDER" .env | cut -d '=' -f 2 | tr -d '\n\r')
API_KEY=$(grep "TRUST_AGENT_LLM_API_KEY" .env | cut -d '=' -f 2 | tr -d '\n\r')
BASE_URL=$(grep "TRUST_AGENT_LLM_BASE_URL" .env | cut -d '=' -f 2 | tr -d '\n\r')

echo ""
echo "Current Configuration:"
echo "  Provider: $PROVIDER"
echo "  API Key: ${API_KEY:0:8}... (${#API_KEY} chars)"
echo "  Base URL: $BASE_URL"
echo ""

# Step 3: Check for duplicate entries
echo "Step 2: Checking for configuration issues..."
DUPLICATE_LINES=$(grep "^TRUST_AGENT_LLM" .env | sort | uniq -d | wc -l)
if [ "$DUPLICATE_LINES" -gt 0 ]; then
    log_warn "Found duplicate configuration entries"
    log_warn "Recommend using .env.fixed which has clean configuration"
fi

# Step 4: Validate API key format
echo ""
echo "Step 3: Validating API key format..."
if [[ "$API_KEY" == "your-valid-"* ]] || [[ "$API_KEY" == "" ]]; then
    log_error "API key is placeholder or empty - MUST UPDATE"
    echo ""
    echo "To fix:"
    echo "  1. Go to: https://console.mistral.ai/api-keys (for Mistral)"
    echo "  2. Generate or copy a valid API key"
    echo "  3. Update .env: TRUST_AGENT_LLM_API_KEY=<your-key>"
    echo ""
    exit 1
fi
log_info "API key format looks valid (32 chars)"

# Step 5: Build and test
echo ""
echo "Step 4: Building TypeScript..."
npm run build > /dev/null 2>&1
log_info "Build successful"

echo ""
echo "Step 5: Testing Mistral API authentication..."
if npm run build && npx ts-node-dev --respawn --transpile-only test-mistral-auth.ts 2>&1 | grep -q "successful"; then
    log_info "✓ Mistral API authentication is working!"
    echo ""
    echo "=================================================="
    log_info "All checks passed - Agent should now respond to chats"
    echo "=================================================="
else
    log_error "Mistral API still returning 401"
    echo ""
    echo "Possible solutions:"
    echo "  1. Verify API key at: https://console.mistral.ai/"
    echo "  2. Check if account is active and not rate-limited"
    echo "  3. Try alternative: Use Ollama instead (see README)"
    echo ""
    exit 1
fi
