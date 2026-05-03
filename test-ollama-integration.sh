#!/bin/bash

# =============================================================================
# Test Suite: EduCreds Trust Agent + Ollama Integration
# =============================================================================
# Run this script to verify Ollama + Trust Agent setup
#
# Usage:
#   bash test-ollama-integration.sh
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
  echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
  echo -e "${GREEN}[✓ PASS]${NC} $1"
  ((TESTS_PASSED++))
}

log_fail() {
  echo -e "${RED}[✗ FAIL]${NC} $1"
  ((TESTS_FAILED++))
}

log_skip() {
  echo -e "${YELLOW}[⊘ SKIP]${NC} $1"
}

# =============================================================================
# Test 1: Check Ollama Installation
# =============================================================================
test_ollama_installed() {
  log_test "Ollama is installed"

  if command -v ollama &> /dev/null; then
    local version=$(ollama --version)
    log_pass "Ollama installed: $version"
  else
    log_fail "Ollama not found. Install with: curl -fsSL https://ollama.ai/install.sh | sh"
  fi
}

# =============================================================================
# Test 2: Check Ollama Daemon Running
# =============================================================================
test_ollama_daemon() {
  log_test "Ollama daemon is running"

  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    log_pass "Ollama daemon is accessible at http://localhost:11434"
  else
    log_skip "Ollama daemon not running. Start with: ollama serve"
  fi
}

# =============================================================================
# Test 3: Check Required Models
# =============================================================================
test_ollama_models() {
  log_test "Check for required models"

  if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    log_skip "Cannot connect to Ollama daemon"
    return
  fi

  local models=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*' | cut -d'"' -f4)

  if echo "$models" | grep -q "mistral"; then
    log_pass "mistral model is installed"
  else
    log_fail "mistral model not found. Install with: ollama pull mistral"
  fi

  if echo "$models" | grep -q "neural-chat"; then
    log_pass "neural-chat model is installed"
  else
    log_skip "neural-chat model not found (optional). Install with: ollama pull neural-chat"
  fi
}

# =============================================================================
# Test 4: Check .env Configuration
# =============================================================================
test_env_config() {
  log_test ".env file exists and is configured"

  if [ ! -f ".env" ]; then
    log_fail ".env file not found. Create with: cp .env.ollama .env"
    return
  fi

  log_pass ".env file exists"

  if grep -q "TRUST_AGENT_LLM_PROVIDER" .env; then
    log_pass "TRUST_AGENT_LLM_PROVIDER is configured"
  else
    log_fail "TRUST_AGENT_LLM_PROVIDER not configured in .env"
  fi

  if grep -q "TRUST_AGENT_OLLAMA_ENABLED=true" .env; then
    log_pass "TRUST_AGENT_OLLAMA_ENABLED is true"
  else
    log_fail "TRUST_AGENT_OLLAMA_ENABLED is not enabled"
  fi

  if grep -q "TRUST_AGENT_MULTI_MODEL_ENABLED=true" .env; then
    log_pass "Multi-model routing is enabled (task-aware)"
  else
    log_skip "Multi-model routing disabled (using single model)"
  fi
}

# =============================================================================
# Test 5: Check Node Modules
# =============================================================================
test_dependencies() {
  log_test "Dependencies are installed"

  if [ ! -d "node_modules" ]; then
    log_fail "node_modules not found. Run: npm install"
    return
  fi

  log_pass "node_modules found"

  if [ -d "node_modules/openai" ]; then
    log_pass "OpenAI client is installed"
  else
    log_fail "OpenAI client not found"
  fi
}

# =============================================================================
# Test 6: Check Trust Agent Source Files
# =============================================================================
test_source_files() {
  log_test "Trust Agent source files exist"

  local files=(
    "src/config.ts"
    "src/server.ts"
    "src/services/llmClient.ts"
    "src/agent/trustAgent.ts"
    "src/routes/agentRoutes.ts"
  )

  for file in "${files[@]}"; do
    if [ -f "$file" ]; then
      log_pass "$file exists"
    else
      log_fail "$file not found"
    fi
  done
}

# =============================================================================
# Test 7: Check Ollama Integration Code
# =============================================================================
test_ollama_code() {
  log_test "Ollama integration code is present"

  if grep -q "class OllamaClient" src/services/llmClient.ts; then
    log_pass "OllamaClient class found"
  else
    log_fail "OllamaClient class not found in llmClient.ts"
  fi

  if grep -q "class ModelRouter" src/services/llmClient.ts; then
    log_pass "ModelRouter class found (multi-model routing)"
  else
    log_fail "ModelRouter class not found in llmClient.ts"
  fi

  if grep -q "completeLLMTask" src/agent/trustAgent.ts; then
    log_pass "completeLLMTask method found (task-aware routing)"
  else
    log_fail "completeLLMTask method not found in trustAgent.ts"
  fi
}

# =============================================================================
# Test 8: Syntax Check (TypeScript)
# =============================================================================
test_typescript() {
  log_test "TypeScript compilation"

  if command -v npx &> /dev/null; then
    if npx tsc --noEmit 2> /dev/null; then
      log_pass "TypeScript files compile without errors"
    else
      log_fail "TypeScript compilation errors found"
    fi
  else
    log_skip "npx not available, skipping TypeScript check"
  fi
}

# =============================================================================
# Summary
# =============================================================================
print_summary() {
  echo ""
  echo "============================================"
  echo "Test Results"
  echo "============================================"
  echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
  echo -e "${RED}Failed:${NC} $TESTS_FAILED"
  echo ""

  if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start Ollama daemon: ollama serve"
    echo "  2. Start Trust Agent: npm run dev"
    echo "  3. Test API: curl http://localhost:3010/api/trust-agent/health"
    echo ""
    exit 0
  else
    echo -e "${RED}✗ Some tests failed. Please review above.${NC}"
    echo ""
    echo "For help, see: OLLAMA_INTEGRATION.md"
    echo ""
    exit 1
  fi
}

# =============================================================================
# Main
# =============================================================================

echo ""
echo "========== EduCreds Trust Agent + Ollama Integration Test =========="
echo ""

test_ollama_installed
test_ollama_daemon
test_ollama_models
test_env_config
test_dependencies
test_source_files
test_ollama_code
test_typescript

print_summary
