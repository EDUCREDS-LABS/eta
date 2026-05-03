# Ollama Integration Guide - EduCreds Trust Agent

## Overview

This guide walks you through integrating **Ollama** (local, open-source LLM inference) with your EduCreds Trust Agent. This enables:

- ✅ **Zero API costs** — Run models entirely on your VPS
- ✅ **Full privacy** — No data leaves your infrastructure
- ✅ **Sub-second latency** — Local inference vs. network round-trips
- ✅ **Task-specific model routing** — Intelligent model selection per task type
- ✅ **Fallback resilience** — Graceful degradation if models unavailable

---

## Quick Start (5 Minutes)

### 1. Install Ollama on Your VPS

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

For **Linux**, this installs Ollama as a system service. Check status:

```bash
systemctl status ollama
# If not running, start it:
systemctl start ollama
```

### 2. Start Ollama Daemon

```bash
# Method 1: As a service (runs in background)
systemctl start ollama

# Method 2: Manual start (foreground, useful for debugging)
ollama serve
```

Ollama listens on `http://localhost:11434` by default.

### 3. Download a Model

```bash
# Recommended for governance & PoIC analysis
ollama pull mistral

# Or choose another model (see Table below for comparison)
ollama pull neural-chat
```

Model download times vary by size and internet speed (typical: 5-15 minutes).

### 4. Configure Trust Agent

```bash
cd educreds_trust_agent

# Copy Ollama-optimized configuration
cp .env.ollama .env

# Edit .env to match your setup (optional)
nano .env
```

### 5. Start Trust Agent

```bash
npm install  # First time only
npm run dev  # Starts on port 3010
```

### 6. Verify Integration

```bash
# Test the trust agent API
curl -X POST http://localhost:3010/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "queryType": "FREEFORM",
    "question": "What are the key factors in institutional credibility?"
  }'

# Check Ollama is running
curl http://localhost:11434/api/tags
```

---

## Configuration Guide

### Option A: Fully Local (Privacy-First)

**Best for:** Maximum privacy, zero API costs, consistent governance

```bash
# .env
TRUST_AGENT_LLM_PROVIDER=ollama
TRUST_AGENT_LLM_BASE_URL=http://localhost:11434/v1
TRUST_AGENT_LLM_MODEL=mistral

TRUST_AGENT_MULTI_MODEL_ENABLED=false
TRUST_AGENT_OLLAMA_ENABLED=true
TRUST_AGENT_OLLAMA_BASE_URL=http://localhost:11434/v1
TRUST_AGENT_OLLAMA_MODEL=mistral
```

**Pros:**
- No API keys needed
- All inference local, instant
- Perfect PoIC consistency

**Cons:**
- Slower for complex queries (single model)
- Limited model diversity

---

### Option B: Hybrid (Balance & Intelligence)

**Best for:** Balanced cost/quality, task-specific optimization

```bash
# .env
TRUST_AGENT_LLM_PROVIDER=openai                    # Primary for complex tasks
TRUST_AGENT_LLM_API_KEY=sk-proj-your-key
TRUST_AGENT_LLM_MODEL=gpt-4.1-mini

TRUST_AGENT_MULTI_MODEL_ENABLED=true               # Smart routing
TRUST_AGENT_OLLAMA_ENABLED=true                    # Local for PoIC
TRUST_AGENT_OLLAMA_BASE_URL=http://localhost:11434/v1
TRUST_AGENT_OLLAMA_MODEL=mistral

TRUST_AGENT_MISTRAL_ENABLED=true                   # Governance reasoning
TRUST_AGENT_MISTRAL_API_KEY=your-mistral-key
TRUST_AGENT_MISTRAL_MODEL=mistral-small
```

**Routing Logic:**
- `POIC_CALCULATION` → **Ollama** (local, fast, consistent)
- `GOVERNANCE_ADVICE` → **Mistral** (strong reasoning) → fallback to **Ollama**
- `CREDENTIAL_RISK_ANALYSIS` → **Mistral** → fallback to **Ollama**
- `ETA_PROMPT` → **Ollama** (fast) → fallback to primary
- `FREEFORM` → **OpenAI** (primary)

**Pros:**
- Cost optimized (PoIC calculations are free)
- High quality for governance decisions
- Resilient with fallbacks

**Cons:**
- Requires API keys for Mistral/OpenAI
- More moving parts

---

### Option C: Specialist Setup (Cost-Optimized)

**Best for:** Minimal API usage, maximize free local inference

```bash
# .env
TRUST_AGENT_LLM_PROVIDER=ollama
TRUST_AGENT_LLM_BASE_URL=http://localhost:11434/v1
TRUST_AGENT_LLM_MODEL=neural-chat            # Fast, balanced quality

TRUST_AGENT_MULTI_MODEL_ENABLED=true
TRUST_AGENT_OLLAMA_ENABLED=true
TRUST_AGENT_OLLAMA_MODEL=neural-chat

# Skip Mistral/OpenAI — all local
TRUST_AGENT_MISTRAL_ENABLED=false
```

**Pros:**
- Zero API costs
- Simple configuration
- Good performance/quality balance

---

## Model Selection

| Model | Size | VRAM | Speed | Best For | Cost |
|-------|------|------|-------|----------|------|
| **mistral** | 7.2B | 4-6GB | ⚡ Fast | PoIC/Governance (DEFAULT) | Free |
| **neural-chat** | 7.2B | 4-6GB | ⚡ Fast | Balanced conversations | Free |
| **llama2** | 7B/13B | 4-8GB | 🟡 Medium | Strong reasoning | Free |
| **dolphin-mixtral** | 45B | 20GB+ | 🐌 Slow | Best quality (premium) | Free |
| **phi** | 2.7B | 2-4GB | ⚡⚡ Ultra-fast | Lightweight tasks | Free |

### Recommended by Use Case

| Use Case | Model | Reason |
|----------|-------|--------|
| Development/Testing | `phi` or `orca-mini` | Fastest startup, lowest VRAM |
| Production PoIC | `mistral` | Fast, consistent, proven reasoning |
| Governance Analysis | `mistral` + `mistral-small` API | Strong institutional analysis |
| Cost-Optimized | `neural-chat` | Best quality/speed/VRAM balance |
| Maximum Quality | `dolphin-mixtral` + OpenAI fallback | Best reasoning (if you have 20GB+ VRAM) |

---

## Setup with Helper Script

Use the provided `setup-ollama.sh` for automated setup:

```bash
cd educreds_trust_agent

# Interactive menu
./setup-ollama.sh

# Or direct commands:
./setup-ollama.sh --quick-start        # Install & pull mistral
./setup-ollama.sh --pull-all           # Pull all recommended models
./setup-ollama.sh --verify             # Check setup health
./setup-ollama.sh --models             # Show model comparison
```

---

## Task-Aware Model Routing

When `TRUST_AGENT_MULTI_MODEL_ENABLED=true`, tasks automatically route to optimal models:

### 1. POIC_CALCULATION (Institution Credibility Scoring)
```
Preferred: Ollama (mistral)
→ Why: Local, fast, consistent for reproducible PoIC scores
→ Fallback: Primary LLM
```

**Use Case:** Scoring institution legitimacy, risk assessment
```bash
curl -X POST http://localhost:3010/api/analyze-institution-onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "institutionName": "Example University",
    "jurisdiction": "NG",
    "accreditationSummary": "..."
  }'
# → Routed to Ollama:mistral
```

---

### 2. GOVERNANCE_ADVICE (Policy & Governance Analysis)
```
Preferred: Mistral API (if enabled)
→ Why: Specialized reasoning for governance structures
→ Fallback: Ollama → Primary LLM
```

**Use Case:** Analyzing governance proposals, risk flags
```bash
curl -X POST http://localhost:3010/api/analyze-governance-proposal \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Update institution verification protocol",
    "description": "...",
    "changes": {...}
  }'
# → Routed to Mistral → Ollama → OpenAI (fallback chain)
```

---

### 3. CREDENTIAL_RISK_ANALYSIS (Risk Assessment)
```
Preferred: Mistral API
→ Why: Analytical reasoning for fraud/risk patterns
→ Fallback: Ollama → Primary LLM
```

**Use Case:** Analyzing credential disputes, fraud detection
```bash
curl -X POST http://localhost:3010/api/analyze-dispute \
  -H "Content-Type: application/json" \
  -d '{
    "institutionId": "inst_123",
    "title": "Suspicious certificate revocation pattern",
    "description": "...",
    "severity": "high"
  }'
# → Routed to Mistral → Ollama
```

---

### 4. ETA_PROMPT (User-Facing Questions)
```
Preferred: Ollama (fast, local)
→ Why: Sub-second latency for dashboard responsiveness
→ Fallback: Primary LLM
```

**Use Case:** Dashboard prompts, user questions
```bash
curl -X POST http://localhost:3010/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the key governance mechanisms?"
  }'
# → Routed to Ollama (fast)
```

---

### 5. FREEFORM (Generic Queries)
```
Preferred: Primary LLM (configured provider)
→ Fallback: None
```

**Use Case:** Generic analysis requests
- Uses your primary `TRUST_AGENT_LLM_PROVIDER` (OpenAI, Mistral, etc.)
- No special routing

---

## Monitoring & Debugging

### Check Ollama Status
```bash
# Show running models
curl http://localhost:11434/api/tags

# Example output:
{
  "models": [
    {"name": "mistral:latest", "digest": "...", "size": 4500},
    {"name": "neural-chat:latest", "digest": "...", "size": 4500}
  ]
}
```

### View Trust Agent Logs
```bash
# If running with npm
npm run dev

# Or with systemd
journalctl -u trust-agent -f

# Or Docker
docker logs educreds_trust_agent
```

### Test LLM Connection
```bash
# Test Ollama directly
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "prompt": "What is institutional credibility?",
    "stream": false
  }'

# Test via Trust Agent
curl -X POST http://localhost:3010/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "queryType": "FREEFORM",
    "question": "Test question"
  }' | jq .metadata.modelVersion
```

### Performance Baseline (Ollama mistral on 8GB VRAM)
```
First request (model load):     ~5-10 seconds
Subsequent requests:            ~1-3 seconds
PoIC calculation (500 tokens):  ~2-4 seconds
Max concurrent requests:        1-2 (depends on VRAM)
```

---

## Troubleshooting

### "Connection refused" / Ollama not running

```bash
# Start Ollama daemon
systemctl start ollama

# Or manually in foreground
ollama serve

# Verify it's listening
curl http://localhost:11434/api/tags
```

### "Model not found" error

```bash
# List installed models
ollama list

# Pull the required model
ollama pull mistral

# Or use setup script
./setup-ollama.sh --pull-all
```

### Slow inference / "timeout" errors

**Cause:** Model too large for available VRAM, or system under load

**Solutions:**
```bash
# Use smaller model
TRUST_AGENT_OLLAMA_MODEL=phi      # 2.7B, faster
TRUST_AGENT_OLLAMA_MODEL=orca-mini # 3B, balanced

# Or increase timeout in config
# Default: 60 seconds in src/services/llmClient.ts
```

### High memory usage

```bash
# Check model sizes
ollama list

# Remove unused models
ollama rm dolphin-mixtral

# Or limit concurrent requests at reverse-proxy level
```

### Model produces poor quality output

**Try:**
1. Bigger model: `mistral` → `llama2` → `dolphin-mixtral`
2. API model fallback: Enable `TRUST_AGENT_MISTRAL_ENABLED=true`
3. System message tuning: See `src/agent/trustAgent.ts` prompts
4. Implement fine-tuning: Custom Ollama models for governance

---

##Production Deployment Checklist

- [ ] Ollama installed as system service (`systemctl status ollama`)
- [ ] Required models pulled (`ollama list` shows mistral, neural-chat, etc.)
- [ ] `.env` configured for your provider strategy (local/hybrid/api)
- [ ] `TRUST_AGENT_MULTI_MODEL_ENABLED=true` if using task routing
- [ ] Firewall: Ollama port 11434 accessible only from Trust Agent
- [ ] Monitoring: Set up logs rotation, uptime checks
- [ ] Backup: Model directory `~/.ollama/models` on regular snapshots
- [ ] Testing: Run integration tests before production traffic
- [ ] Documentation: Team knows which models are in use and why

---

## Cost Analysis

### Scenario: Analyzing 100 institutions/month

| Strategy | API Calls | Cost | Latency |
|----------|-----------|------|---------|
| **Full Ollama (mistral)** | 0 | $0 | 2-4s |
| **Hybrid (Ollama + Mistral)** | 30 | ~$0.50 | 1-3s |
| **Hybrid (Ollama + OpenAI)** | 20 | ~$2-5 | 1-2s |
| **Full OpenAI gpt-4.1-mini** | 100 | ~$30-50 | 0.5-1.5s |

**Recommendation:** Start with **Hybrid** (Option B) for best balance.

---

## Next Steps

1. **Install Ollama** → `curl -fsSL https://ollama.ai/install.sh | sh`
2. **Run setup script** → `./setup-ollama.sh --quick-start`
3. **Copy config** → `cp .env.ollama .env`
4. **Start agent** → `npm run dev`
5. **Test API** → `curl http://localhost:3010/api/analyze ...`
6. **Monitor logs** → Check `npm` output for routing debug info

---

## Additional Resources

- **Ollama docs:** https://ollama.ai
- **Model library:** https://ollama.ai/library
- **Trust Agent config:** See `.env.example` and `src/config.ts`
- **Routing logic:** See `src/services/llmClient.ts` (ModelRouter class)
- **API docs:** See `documentation/API_DOCUMENTATION.md`

---

## Support

For issues or questions:
1. Check logs: `npm run dev` output
2. Verify Ollama: `curl http://localhost:11434/api/tags`
3. Test directly: `ollama run mistral "Test prompt"`
4. Review config: Compare your `.env` against `.env.ollama`

