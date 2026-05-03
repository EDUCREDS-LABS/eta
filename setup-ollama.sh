#!/bin/bash

# =============================================================================
# EduCreds Trust Agent - Ollama Setup & Model Management Script
# =============================================================================
# This script helps manage Ollama models and configure the Trust Agent
# for local, cost-efficient inference on your VPS.
#
# Usage:
#   ./setup-ollama.sh                    # Show menu
#   ./setup-ollama.sh --pull-all         # Pull all recommended models
#   ./setup-ollama.sh --quick-start      # Pull mistral and start daemon
#   ./setup-ollama.sh --verify           # Check Ollama health
# =============================================================================

set -e

OLLAMA_URL=${OLLAMA_URL:-"http://localhost:11434"}
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[ℹ  INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓  SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[⚠  WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗  ERROR]${NC} $1"
}

# =============================================================================
# 1. Check Ollama Installation
# =============================================================================
check_ollama() {
  log_info "Checking for Ollama installation..."

  if ! command -v ollama &> /dev/null; then
    log_error "Ollama is not installed!"
    echo ""
    echo "To install Ollama, run:"
    echo "  curl -fsSL https://ollama.ai/install.sh | sh"
    echo ""
    echo "Or visit: https://ollama.ai"
    exit 1
  fi

  log_success "Ollama is installed: $(ollama --version)"
}

# =============================================================================
# 2. Check Ollama Daemon Status
# =============================================================================
check_daemon() {
  log_info "Checking Ollama daemon status..."

  if curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
    log_success "Ollama daemon is running at $OLLAMA_URL"
    return 0
  else
    log_warn "Ollama daemon is not running."
    log_info "To start it, run: ollama serve"
    return 1
  fi
}

# =============================================================================
# 3. List Available Models
# =============================================================================
list_models() {
  log_info "Fetching available models..."

  if curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
    log_success "Models installed locally:"
    curl -s "$OLLAMA_URL/api/tags" | grep -o '"name":"[^"]*' | cut -d'"' -f4 | sed 's/^/  • /'
  else
    log_error "Cannot connect to Ollama daemon. Start it with: ollama serve"
  fi
}

# =============================================================================
# 4. Pull Models
# =============================================================================

pull_model() {
  local model=$1
  local description=$2

  log_info "Pulling model: $model ($description)"
  echo "  This may take a few minutes depending on model size and your internet speed..."
  echo ""

  ollama pull "$model"

  log_success "Model $model downloaded successfully!"
}

pull_recommended_models() {
  echo ""
  echo "Recommended models for EduCreds Trust Agent:"
  echo ""
  echo "  [1] mistral          — 7B, fastest reasoning, best for governance (DEFAULT)"
  echo "  [2] neural-chat      — 7B, balanced quality/speed, good conversations"
  echo "  [3] llama2           — 7B, strong reasoning, slower"
  echo "  [4] dolphin-mixtral  — 45B, best quality but slower & more memory (10GB+)"
  echo "  [5] All of the above"
  echo ""
  read -p "Select model(s) to download (default: 1): " choice
  choice=${choice:-1}

  case $choice in
  1)
    pull_model "mistral" "Recommended for governance & PoIC analysis"
    ;;
  2)
    pull_model "neural-chat" "Balanced quality/speed option"
    ;;
  3)
    pull_model "llama2" "Strong reasoning but slower"
    ;;
  4)
    pull_model "dolphin-mixtral" "Best quality (requires 10GB+ VRAM)"
    ;;
  5)
    pull_model "mistral" "Recommended for governance & PoIC analysis"
    pull_model "neural-chat" "Balanced quality/speed option"
    pull_model "llama2" "Strong reasoning but slower"
    log_warn "Skipping dolphin-mixtral (requires 10GB+ VRAM). Pull manually with: ollama pull dolphin-mixtral"
    ;;
  *)
    log_error "Invalid choice. Using default: mistral"
    pull_model "mistral" "Default choice"
    ;;
  esac
}

pull_all_models() {
  log_info "Pulling all recommended models..."
  pull_model "mistral" "Recommended for governance & PoIC analysis"
  pull_model "neural-chat" "Balanced quality/speed option"
  pull_model "llama2" "Strong reasoning but slower"
  log_warn "To also pull dolphin-mixtral (requires 10GB+), run: ollama pull dolphin-mixtral"
}

# =============================================================================
# 5. Quick Start: Pull Mistral and Start Daemon
# =============================================================================
quick_start() {
  log_info "Starting quick setup..."
  check_ollama

  if ! check_daemon; then
    log_info "Starting Ollama daemon in background..."
    # Start Ollama in background
    nohup ollama serve > /tmp/ollama.log 2>&1 &
    sleep 3

    if check_daemon; then
      log_success "Ollama daemon started!"
    else
      log_error "Failed to start Ollama daemon. Check logs at /tmp/ollama.log"
      exit 1
    fi
  fi

  # Check if mistral is already downloaded
  if curl -s "$OLLAMA_URL/api/tags" | grep -q '"mistral"'; then
    log_success "mistral model is already available"
  else
    pull_model "mistral" "Recommended for governance & PoIC analysis"
  fi

  log_success "Quick setup complete!"
  echo ""
  log_info "Next steps:"
  echo "  1. Copy .env.ollama to .env: cp .env.ollama .env"
  echo "  2. Start the Trust Agent: npm run dev"
  echo "  3. Verify at: curl http://localhost:3010/health"
}

# =============================================================================
# 6. Verify Setup
# =============================================================================
verify_setup() {
  echo ""
  log_info "Verifying EduCreds Trust Agent + Ollama setup..."
  echo ""

  check_ollama
  echo ""

  if check_daemon; then
    list_models
    echo ""
    log_success "Setup is ready! You can start the Trust Agent:"
    echo "  npm run dev"
  else
    log_warn "Ollama daemon is not running. Start it with:"
    echo "  ollama serve"
  fi
}

# =============================================================================
# 7. Configure .env
# =============================================================================
configure_env() {
  log_info "Setting up .env configuration..."

  if [ -f "$SCRIPT_DIR/.env" ]; then
    log_warn ".env already exists. Creating backup..."
    cp "$SCRIPT_DIR/.env" "$SCRIPT_DIR/.env.backup.$(date +%s)"
  fi

  log_info "Copying .env.ollama to .env..."
  cp "$SCRIPT_DIR/.env.ollama" "$SCRIPT_DIR/.env"

  log_success ".env configured for Ollama"
  log_info "You can customize settings in .env as needed"
}

# =============================================================================
# 8. Show Model Information
# =============================================================================
show_model_info() {
  echo ""
  echo "Model Comparison for EduCreds Trust Agent:"
  echo ""
  printf "%-20s %-12s %-15s %-20s %-40s\n" "Model" "Size" "VRAM" "Speed" "Best For"
  echo "------------------------------------------------------------------------------------"
  printf "%-20s %-12s %-15s %-20s %-40s\n" \
    "mistral" "7.2B" "4-6GB" "Fast" "PoIC, Governance (DEFAULT)" \
    "neural-chat" "7.2B" "4-6GB" "Fast" "General conversations" \
    "llama2" "7B/13B" "4-8GB" "Medium" "Strong reasoning" \
    "dolphin-mixtral" "45B" "20GB+" "Slow" "Best quality (premium)"
  echo ""
  echo "Notes:"
  echo "  • All models are free and run locally on your VPS"
  echo "  • Sizes shown are approximate quantized versions"
  echo "  • Faster = lower latency, lower VRAM usage"
  echo "  • PoIC calculations benefit from fast, consistent models"
  echo ""
}

# =============================================================================
# 9. Main Menu
# =============================================================================
show_menu() {
  echo ""
  echo "===== EduCreds Trust Agent - Ollama Setup ====="
  echo ""
  echo "  [1] Quick start (check Ollama, pull mistral, start daemon)"
  echo "  [2] Pull models (interactive)"
  echo "  [3] Pull all recommended models"
  echo "  [4] List installed models"
  echo "  [5] Verify setup"
  echo "  [6] Configure .env for Ollama"
  echo "  [7] Show model information"
  echo "  [8] Start Ollama daemon"
  echo "  [0] Exit"
  echo ""
  read -p "Select option (default: 1): " choice
  choice=${choice:-1}

  case $choice in
  1)
    quick_start
    ;;
  2)
    check_ollama
    pull_recommended_models
    ;;
  3)
    check_ollama
    pull_all_models
    ;;
  4)
    list_models
    ;;
  5)
    verify_setup
    ;;
  6)
    configure_env
    ;;
  7)
    show_model_info
    ;;
  8)
    check_ollama
    log_info "Starting Ollama daemon..."
    ollama serve
    ;;
  0)
    log_info "Exiting."
    exit 0
    ;;
  *)
    log_error "Invalid option. Please try again."
    show_menu
    ;;
  esac
}

# =============================================================================
# Main Script Logic
# =============================================================================

case "${1:-}" in
--pull-all)
  check_ollama
  pull_all_models
  ;;
--quick-start)
  quick_start
  ;;
--verify)
  verify_setup
  ;;
--models)
  show_model_info
  ;;
--help | -h)
  echo "EduCreds Trust Agent - Ollama Setup Script"
  echo ""
  echo "Usage: $0 [OPTION]"
  echo ""
  echo "Options:"
  echo "  --quick-start      Quick setup: check Ollama, pull mistral, start daemon"
  echo "  --pull-all         Pull all recommended models"
  echo "  --verify           Check Ollama and Trust Agent setup"
  echo "  --models           Show model comparison information"
  echo "  --help, -h         Show this help message"
  echo ""
  echo "Without options, shows interactive menu."
  ;;
*)
  show_menu
  ;;
esac

echo ""
