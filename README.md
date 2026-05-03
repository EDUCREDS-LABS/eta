## EduCreds Trust Agent (Intelligence Layer)

**Purpose**

The EduCreds Trust Agent is a dedicated AI microservice that provides an intelligence layer for:

- **Governance advice** (DAO / governance dashboard support)
- **Credential and policy risk analysis**
- **Prompt design for ETA / Elastic-style trust agents**
- **Freeform reasoning** about EduCreds workflows, configured programs, and institutions

It exposes a simple HTTP API that other EduCreds services (frontend, `cert_backend`, governance dashboard) can call.

---

## 🚀 Quick Start with Ollama (Local LLM - Zero API Costs)

**New!** Run the Trust Agent entirely on your VPS with **Ollama** for maximum privacy and cost efficiency:

```bash
# 1. Install Ollama (one-time)
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Quick setup (pull models, configure)
cd educreds_trust_agent
./setup-ollama.sh --quick-start

# 3. Start the agent
npm run dev
```

✅ **Zero API costs** | ✅ **Sub-second latency** | ✅ **Full data privacy** | ✅ **Task-specific model routing**

👉 **[Full Ollama Integration Guide →](OLLAMA_INTEGRATION.md)**

---

### 1. Folder layout

- **`package.json`** – Node/TypeScript service definition and scripts  
- **`tsconfig.json`** – TypeScript compiler configuration  
- **`.eslintrc.cjs`** – Basic ESLint rules for consistent code style  
- **`.env.example`** – Example environment variables for local/staging/prod  
- **`.env.ollama`** – Pre-configured for local Ollama inference (NEW!)
- **`setup-ollama.sh`** – Automated Ollama model management (NEW!)
- **`OLLAMA_INTEGRATION.md`** – Comprehensive Ollama setup guide (NEW!)
- **`src/config.ts`** – Centralised configuration loading from env  
- **`src/server.ts`** – Express HTTP server and wiring  
- **`src/services/llmClient.ts`** – LLM client abstraction (OpenAI-compatible + Ollama + ModelRouter)  
- **`src/agent/trustAgent.ts`** – Core EduCreds Trust Agent logic  
- **`src/routes/agentRoutes.ts`** – REST API routes for the agent

---

### 2. Prerequisites

- **Node.js 18+** (recommended 18 or 20)
- **npm** (comes with Node)
- **LLM Provider** (choose one):
  - **Ollama** (recommended) – local inference, free, zero API costs → [Quick Start Guide](OLLAMA_INTEGRATION.md)
  - **OpenAI API key** – `OPENAI_API_KEY`
  - **Mistral API key** – `MISTRAL_API_KEY`
  - **Gemini API key** – Full Google AI setup
  - Any **OpenAI-compatible endpoint** (proxy, self-hosted, etc.)

**For local Ollama setup:** See [OLLAMA_INTEGRATION.md](OLLAMA_INTEGRATION.md) — requires only Node.js and Ollama installed.

---

### 3. Environment configuration

From the repo root:

```bash
cd educreds_trust_agent

# For local Ollama (recommended)
cp .env.ollama .env

# OR for cloud APIs
cp .env.example .env
```

Edit `.env` and configure:

**Core Settings:**
- **`TRUST_AGENT_PORT`** – port for the agent (default `3010`)  
- **`TRUST_AGENT_LLM_PROVIDER`** – `openai`, `mistral`, `gemini`, or **`ollama`** (NEW!)
- **`TRUST_AGENT_LLM_MODEL`** – model name (e.g. `gpt-4.1-mini`, `mistral-small`, or **`mistral`** for Ollama)

**For Ollama:**
```bash
TRUST_AGENT_LLM_PROVIDER=ollama
TRUST_AGENT_LLM_BASE_URL=http://localhost:11434/v1
TRUST_AGENT_LLM_MODEL=mistral
TRUST_AGENT_MULTI_MODEL_ENABLED=true  # Enable task-aware routing
```

**For Cloud APIs:**
- **`TRUST_AGENT_LLM_API_KEY`** – your LLM key  
- **`TRUST_AGENT_LLM_BASE_URL`** – API endpoint (usually `https://api.openai.com/v1`)  
- **`TRUST_AGENT_FRONTEND_URL`** – origin allowed by CORS (e.g. `http://localhost:5002`)

### Multi-Model Routing (NEW!)

Enable intelligent task-based model selection:

```bash
TRUST_AGENT_MULTI_MODEL_ENABLED=true        # Smart routing

# Use Ollama for local PoIC calculations
TRUST_AGENT_OLLAMA_ENABLED=true
TRUST_AGENT_OLLAMA_BASE_URL=http://localhost:11434/v1
TRUST_AGENT_OLLAMA_MODEL=mistral

# Use Mistral for governance reasoning (optional)
TRUST_AGENT_MISTRAL_ENABLED=true
TRUST_AGENT_MISTRAL_API_KEY=your-key
TRUST_AGENT_MISTRAL_MODEL=mistral-small
```

**Routing Logic:**
- `POIC_CALCULATION` → **Ollama** (local, consistent)
- `GOVERNANCE_ADVICE` → **Mistral** → **Ollama** (fallback)
- `CREDENTIAL_RISK_ANALYSIS` → **Mistral** → **Ollama**
- `ETA_PROMPT` → **Ollama** (fast)
- `FREEFORM` → Primary model

See [OLLAMA_INTEGRATION.md](OLLAMA_INTEGRATION.md#task-aware-model-routing) for detailed routing examples.

```bash
curl http://localhost:3010/api/trust-agent/health
```

- Example analysis call:

```bash
curl -X POST http://localhost:3010/api/trust-agent/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "queryType": "ETA_PROMPT",
    "question": "Help me design an ETA-style prompt to evaluate the governance risk of issuing cross-border micro-credentials.",
    "governanceContext": {
      "institutionId": "demo-institution",
      "actorRole": "GOVERNANCE_COUNCIL",
      "jurisdiction": "NG",
      "riskAppetite": "low"
    },
    "credentialContext": {
      "programName": "Online Data Science Micro-credential",
      "level": "Certificate",
      "deliveryMode": "online",
      "volumeEstimatePerYear": 500
    }
  }'
```

You should receive a JSON response:

```json
{
  "summary": "...",
  "riskScore": 0-100,
  "recommendations": ["..."]
}
```

#### 5.2 Production build

```bash
cd educreds_trust_agent
npm run build
npm start
```

In production, run this under:

- **PM2** (like `cert_backend`), or  
- Docker / Kubernetes (see below for a minimal Dockerfile outline)

---

### 6. API contract

Base path: **`/api/trust-agent`**

- **`GET /health`**
  - Returns `{ status: "ok", service: "educreds_trust_agent" }`.

- **`POST /analyze`**
  - Body schema:

```json
{
  "queryType": "ETA_PROMPT | GOVERNANCE_ADVICE | CREDENTIAL_RISK_ANALYSIS | FREEFORM",
  "question": "string (min 5 chars)",
  "governanceContext": {
    "institutionId": "string (optional)",
    "actorRole": "string (optional)",
    "jurisdiction": "string (optional)",
    "riskAppetite": "string (optional)",
    "governanceVersion": "string (optional)"
  },
  "credentialContext": {
    "templateId": "string (optional)",
    "programName": "string (optional)",
    "level": "string (optional)",
    "deliveryMode": "string (optional)",
    "volumeEstimatePerYear": 123
  },
  "rawContext": {
    "...": "any additional context from cert_backend or governance engine"
  }
}
```

  - Response example:

```json
{
  "summary": "Human-readable explanation and recommendation.",
  "riskScore": 78,
  "recommendations": [
    "Tighten veto window for high-risk cross-border programs.",
    "Require at least 2-of-3 approvals from governance council.",
    "Log all credential issuance events for post-hoc audits."
  ],
  "rawModelResponse": { "summary": "...", "riskScore": 78, "recommendations": ["..."] }
}
```

Any Zod validation errors return **400** with details. Internal errors return **500** with a generic message.

---

### 7. Professional integration with existing EduCreds services

You have a few natural integration points:

- **Governance dashboard (frontend)** – whenever an admin configures proposals, thresholds, or veto windows, call `/api/trust-agent/analyze` with `queryType: "GOVERNANCE_ADVICE"` to:
  - Explain the impact of settings
  - Highlight potential attack vectors or governance anti-patterns
  - Suggest safer defaults for higher-risk institutions

- **Credential template designer** – when a template is created/edited, call with `queryType: "CREDENTIAL_RISK_ANALYSIS"` to:
  - Assess privacy exposure of fields
  - Recommend better data minimisation / consent wording
  - Flag high-risk combinations of attributes

- **Elastic Trust Agent / ETA prompt builder** – for your “prompt for ETA using elastic agent builder” use case:
  - Send the draft prompt and context with `queryType: "ETA_PROMPT"`.
  - The Trust Agent will respond with a refined summary and recommendations you can surface as:
    - “Prompt quality score”
    - “Suggested improvements”
    - “Example evaluation scenarios”

Implementation sketch from a frontend/other TS service:

```ts
const res = await fetch("http://localhost:3010/api/trust-agent/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    queryType: "ETA_PROMPT",
    question: draftPrompt,
    governanceContext,
    credentialContext,
    rawContext: {
      // e.g. governanceConfig, institutionProfile, etc.
    }
  })
});

const data = await res.json();
// data.summary, data.riskScore, data.recommendations
```

For backend (Node/TypeScript) integration in `cert_backend`, you can re-use `axios` or `fetch` and the same JSON payload.

---

### 8. Optional: Dockerisation outline

If you want to ship this as a container alongside your existing stack:

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json .eslintrc.cjs ./
COPY src ./src

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3010

CMD ["npm", "start"]
```

Then:

```bash
docker build -t educreds-trust-agent .
docker run --env-file .env -p 3010:3010 educreds-trust-agent
```

You can also wire this into your existing `docker-compose.yml` as another service and share network/environment with `cert_backend`.

---

### 9. Hardening & next steps

- **Authentication**: front services should attach a JWT or API key; the agent should verify it before accepting sensitive `rawContext`.  
- **Rate limiting**: wrap the Express app with rate limiting middleware if exposed publicly.  
- **Logging & observability**: integrate with your existing logging stack (e.g. PM2, Elastic, Loki) and add structured logs per request.  
- **Provider abstraction**: extend `createLLMClient` to support Anthropic or local models through config only.

This gives you a clean, professional “intelligence layer” that matches the Elastic/ETA style workflow and can be evolved without disturbing your core credential and governance services.

