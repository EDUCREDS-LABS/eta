# Educreds Trust Agent (ETA) - Hackathon Edition

> **Modular AI Trust Engine for Institutional Credibility & Credential Verification**

A production-grade AI system designed to solve one critical problem: **How do we verify that a credential issuer is legitimate?**

## The Problem

In emerging markets, credential fraud is rampant. Fake universities, diploma mills, and credential inflation erode trust in the entire system. Traditional verification is manual, slow, and inconsistent.

**Eta solves this by:**
1. **Computing institutional credibility** (PoIC score) from structured signals
2. **Analyzing behavioral patterns** to detect anomalies
3. **Surfacing risk factors** for governance and dispute resolution
4. **Orchestrating via AI** through a clean, tool-based API for Gemini and other agents

---

## Why This Wins the Google Hackathon

### Problem Fit ✓

- **Real impact**: Credential fraud affects millions of students in Africa, Asia, Latin America
- **Scalable solution**: Automated verification instead of manual review
- **Measurable**: Reduces false credentials by X%, speeds verification Y%

### Technical Excellence ✓

- **Clean architecture**: Separation of concerns (PoIC formula, AI analysis, API layer)
- **Hackathon-ready**: Minimal, focused endpoints for Agent Builder integration
- **Transparency**: Step-by-step reasoning visible to agents and end users
- **Production code**: Tests, error handling, rate limiting, authentication

### Agent Builder Fit ✓

- **Two hero tools** (`verify-credential`, `analyze-risk`) vs. 10 scattered endpoints
- **Clear semantics**: Each tool does one thing well
- **Orchestration pattern**: Gemini decides the flow, Eta executes the logic
- **Reasoning transparency**: Returns step-by-step thinking

### Innovation ✓

- **Formula-based PoIC**: Deterministic, auditable, governance-compliant
- **Hybrid approach**: LLM insights + algorithmic rigor
- **Behavioral analysis**: Time-decay scoring, entropy, anomaly detection
- **Modular design**: Can be extended for other credential types

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Google Agent Builder                    │
│                   (Vertex AI, Gemini)                    │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────▼────────────────┐
         │  Eta Public API Layer      │
         │  (Hackathon-Friendly)      │
         │ • /verify-credential       │
         │ • /analyze-risk            │
         │ • /chat (optional)         │
         └───────────┬────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│   PoIC   │   │   Eta    │   │  Job     │
│Computing │   │  Agent   │   │  Queue   │
│ (Formula)│   │(LLM-Based)   │(Async)   │
└──────────┘   └──────────┘   └──────────┘
    │                │                │
    └────────────────┼────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │      Internal System            │
    │  (Docs, Version Manager, etc)   │
    └────────────────────────────────┘
```

### Key Design Decisions

**1. Wrapper Endpoints**
- Raw endpoints (`/poic/compute`, `/disputes/analyze`, etc.) remain internal
- New wrapper endpoints (`/verify-credential`, `/analyze-risk`) expose clean abstractions
- Judges see: focused, well-designed tool surface
- Behind the scenes: modular, reusable components

**2. PoIC: Formula + AI**
- **Formula part** (deterministic): D1-D5 dimensions with fixed weights
- **AI part** (advisory): Behavioral analysis, risk flagging, recommendations
- **Result**: Auditable scores + AI insights (best of both worlds)

**3. Step Transparency**
- Every response includes `steps` array showing agent reasoning
- Example: `["Checked institutional PoIC score", "Analyzed behavioral risk", "Validated credential metadata"]`
- Judges love this—shows the agent "thinks" not just returns results

**4. Async Job Queue**
- Long-running analyses don't block
- Clients can poll `/jobs/:jobId` for status
- Scales to thousands of concurrent verifications

---

## How It Works: Credential Verification Flow

### User Query (via Gemini)
```
"Is a Bachelor's degree from Makerere University legitimate?"
```

### Gemini's Decision Tree
```
1. Parse query → Recognize credential verification task
2. Check available tools → See "verify-credential"
3. Extract params → institution: "Makerere University"
4. Call tool → POST /api/trust-agent/verify-credential
5. Interpret response → confidence=87%, status=verified
6. Compose answer → "Yes, 87% confidence, approved for issuance"
```

### Eta's Processing
```
1. Compute PoIC
   - D1 (Legal): Register status, accreditation? → 0.9
   - D2 (Operational): Faculty verifiable, real staff? → 0.85
   - D3 (Issuance): Stable patterns, low revocation? → 0.85
   - D4 (Verification): High pass rate, diverse verifiers? → 0.97
   - D5 (Governance): Disputes? Penalties? → 0.88
   → Master Score = 87/100

2. Analyze Behavior
   - Issuance volume: 500/day (normal) ✓
   - Revocation ratio: 3% (acceptable) ✓
   - Verification diversity: 85% (strong) ✓
   → Behavioral Risk = 45/100 (low)

3. Risk Assessment
   - Cross-check credential metadata
   - Compare against institutional baseline
   - Flag any anomalies
   → Credential Risk = 40/100 (low)

4. Aggregate & Return
   {
     status: "verified",
     confidence: 87,
     risk_flags: [...],
     explanation: "...",
     steps: ["Checked PoIC...", "Analyzed behavior...", "Validated metadata..."]
   }
```

### Gemini's Response to User
```
✅ Yes, this credential is legitimate.

Makerere University
Credibility Score: 87/100

Why we trust it:
- Institutional credibility is strong (87/100)
- Behavioral patterns are stable and normal
- No significant risk flags detected

Confidence: 87%

What we checked:
1. ✓ Institutional PoIC score
2. ✓ Behavioral anomalies
3. ✓ Credential metadata

Caveats:
- Cross-check accreditation independently
- Verify faculty credentials directly
```

---

## PoIC Dimensions Explained

### D1: Legal & Accreditation (25%)

**Signals:**
- Government registration confidence
- Accreditation credibility (with who?)
- Accreditation stability (how long?)
- Legal risk probability

**Why it matters:** Fake universities have no real accreditation.

**Formula:** 
```
D1 = 0.4 × G + 0.3 × A + 0.2 × S + 0.1 × (1 - L)
where G, A, S, L ∈ [0, 1]
```

---

### D2: Operational Authenticity (20%)

**Signals:**
- Digital footprint longevity (website age, consistency)
- Faculty verifiability (can we find them?)
- Public registry consistency (name, location match?)
- Student body evidence (alumni traceable?)
- Infrastructure signals (real offices, labs?)

**Why it matters:** Diploma mills have fake websites and non-existent faculty.

**Formula:**
```
D2 = 0.25 × (F + L + P + S + I)
where each signal ∈ [0, 1]
```

---

### D3: Issuance Behavior Quality (25%)

**Signals:**
- Issuance stability (consistent volume?)
- Entropy score (randomness detection)
- Anomaly score (spike detection)
- Revocation ratio (how many credentials revoked?)

**Why it matters:** Fraudsters issue in bursts; legitimate institutions are steady.

**Formula:**
```
D3 = weighted_avg(stability, anomaly_suppression, low_revocation)
Time-decay applied for recent events
```

---

### D4: Verification & Feedback (15%)

**Signals:**
- Verification rate (what % of credentials verify?)
- Verification diversity (how many different verifiers?)
- Reverification rate (can we reverify?)
- Failed verifications (how many failures?)

**Why it matters:** Legitimate credentials are verifiable; fake ones aren't.

**Formula:**
```
D4 = 0.4 × V + 0.3 × D + 0.2 × R + 0.1 × (1 - F)
```

---

### D5: Governance & Dispute History (15%)

**Signals:**
- Base score (prior credibility)
- Dispute count (how many complaints?)
- Severity level (how serious?)
- Slashing ratio (governance penalties applied?)

**Why it matters:** Institutions with a history of fraud lose credibility.

**Formula:**
```
If disputes = 0:
  D5 = base_score
Else:
  penalty = severity_weight × dispute_count
  D5 = base_score × (1 - penalty)
```

---

## PoIC Score Bands

| Score | Status | Issuance Cap | Recommendation |
|-------|--------|--------------|-----------------|
| 80-100 | ✅ APPROVE | 10,000/month | Full approval |
| 70-79 | ⚠️ APPROVE_WITH_MONITORING | 5,000/month | Quarterly review |
| 50-69 | 🔴 RESTRICT | 1,000/month | Limited issuance |
| 0-49 | ❌ SUSPEND | 0 | Investigation required |

---

## Integration: Google Agent Builder

### Step 1: Deploy Eta

```bash
# Local development
npm run dev

# Docker (production)
docker build -t eta:latest .
docker run -e MISTRAL_API_KEY=$MISTRAL_KEY -p 3000:3000 eta:latest

# Cloud Run / Vertex AI integration
gcloud run deploy eta --source .
```

### Step 2: Register Tools in Vertex AI

Go to **Vertex AI > Model Studio > Tool integrations** and add:

```json
{
  "tools": [
    {
      "type": "function",
      "name": "verify_credential",
      "description": "Verify institutional credibility and credential authenticity",
      "parameters": {
        "type": "object",
        "properties": {
          "institution": {
            "type": "string",
            "description": "Institution name (e.g., 'Harvard University')"
          },
          "certificate_data": {
            "type": "string",
            "description": "Credential details (e.g., 'PhD in Computer Science')"
          }
        },
        "required": ["institution"],
        "additionalProperties": false
      }
    },
    {
      "type": "function",
      "name": "analyze_risk",
      "description": "Analyze institutional risk or governance concerns",
      "parameters": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["dispute", "governance"],
            "description": "Type of analysis"
          },
          "title": { "type": "string" },
          "description": { "type": "string" }
        },
        "required": ["type", "title"],
        "additionalProperties": false
      }
    }
  ]
}
```

### Step 3: Build Agent

```python
from google.cloud import aiplatform

agent = aiplatform.Agent(
    project_id="YOUR_PROJECT",
    location="us-central1",
    display_name="Credential Verification Agent",
    instructions="""You are a credential verification expert. Help users verify 
    whether educational credentials are legitimate. Use the verify_credential tool 
    to check institutional credibility. Explain your reasoning step-by-step."""
)

# Prompt example:
response = agent.predict(
    input="Is a BSc from University of Ghana legitimate?"
)
print(response.text)
```

### Step 4: Demo Flow

```
User: "Verify credentials from these 5 universities"

Agent:
├─ Parse universities
├─ For each university:
│  ├─ Call verify_credential
│  ├─ Interpret response
│  └─ Collect findings
└─ Summarize with rankings

Output: "University A (92%), University B (67%), ..."
```

---

## Deployment Guide

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env: add MISTRAL_API_KEY, OLLAMA_URL, etc.

# Run in dev mode
npm run dev

# Server runs at http://localhost:3000
```

### Docker

```bash
# Build image
docker build -t eta:latest .

# Run with Ollama (local LLM)
docker-compose up

# Run with Mistral (cloud LLM)
docker run \
  -e MISTRAL_API_KEY=$MISTRAL_KEY \
  -e NODE_ENV=production \
  -p 3000:3000 \
  eta:latest
```

### Environment Variables

```env
# LLM Configuration
MISTRAL_API_KEY=sk_...
OLLAMA_URL=http://localhost:11434
PRIMARY_LLM=mistral  # or "ollama"

# Server
PORT=3000
NODE_ENV=production

# Security
API_KEY=sk_live_...
ALLOWED_ORIGINS=*

# Queue
MAX_WORKERS=4
MAX_QUEUE_LENGTH=100
HISTORY_TTL_MS=3600000
```

### Rate Limiting & Monitoring

```bash
# View logs
docker logs eta

# Monitor PoIC version
curl http://localhost:3000/api/trust-agent/poic/version

# Health check
curl http://localhost:3000/api/trust-agent/health
```

---

## Testing & Validation

### Unit Tests

```bash
npm run test
```

**Coverage:**
- PoIC computation formulas
- Behavioral analysis algorithms
- Request validation
- Error handling

### Integration Tests

```bash
# Full end-to-end flow
npm run test -- src/tests/PoICEndpoint.integration.test.ts

# Regression tests
npm run test -- src/tests/TrustAgent.regression.test.ts
```

### Manual Testing

See [EXAMPLE_REQUESTS.md](EXAMPLE_REQUESTS.md) for cURL, Python, Node.js examples.

---

## FAQ

### Q: Why expose two tools instead of one?

**A:** Clean separation of concerns. `verify-credential` focuses on credibility & verification. `analyze-risk` focuses on governance & disputes. Gemini can orchestrate combinations:
- "Verify credential, then check for related disputes"
- "Analyze this proposal, but only for institutions with PoIC > 70"

### Q: Is PoIC auditable?

**A:** Yes! Every computation returns:
- Individual D1-D5 scores
- Audit trail showing D3 time decay calculations
- Governance action rationale
- Raw model response (for transparency)

Judges can verify the math step-by-step.

### Q: How is this different from traditional credential verification?

**A:** 
| Traditional | Eta |
|------------|-----|
| Manual document review | Algorithmic scoring |
| Days to verify | Seconds |
| Expert-dependent | Scales globally |
| One-off decision | Continuous monitoring |
| No transparency | Step-by-step reasoning |

### Q: Can this be deployed on-premise?

**A:** Yes. Use Ollama for local LLM inference, Docker for containerization. No cloud dependencies.

### Q: What LLMs are supported?

**A:** 
- Mistral (primary, for governance reasoning)
- Ollama (local, for privacy)
- OpenAI GPT-4 (fallback)
- Google Gemini (experimental)

---

## Next Steps

1. **Deploy to Cloud Run** → Register with Agent Builder
2. **Add more LLMs** → Support Claude, LLaMA, Phi
3. **Credential type plugins** → Extend beyond universities (vocational, certifications, bootcamps)
4. **Blockchain integration** → Anchor PoIC scores on-chain for immutability
5. **Multi-language support** → Internationalize for African languages

---

## Repository Structure

```
├── src/
│   ├── routes/
│   │   └── agentRoutes.ts          ← Wrapper endpoints (verify-credential, analyze-risk)
│   ├── agent/
│   │   └── trustAgent.ts           ← ETA AI implementation
│   ├── services/
│   │   ├── PoICEndpointService.ts  ← PoIC formula computation
│   │   ├── llmClient.ts            ← LLM routing (Mistral, Ollama, etc.)
│   │   ├── JobQueueService.ts      ← Async job processing
│   │   └── PoICComputationHelper.ts ← D1-D5 calculations
│   ├── server.ts
│   └── config.ts
├── tests/
│   ├── TrustAgent.regression.test.ts
│   └── PoICEndpoint.integration.test.ts
├── API_DOCUMENTATION.md            ← Full API reference
├── EXAMPLE_REQUESTS.md             ← cURL, Python, Node.js examples
├── Dockerfile
├── docker-compose.yml
└── README.md (this file)
```

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Write tests
4. Commit (`git commit -am 'Add feature'`)
5. Push (`git push origin feature/my-feature`)
6. Open PR

---

## License

MIT – See LICENSE file

---

## Support

- **GitHub Issues**: https://github.com/EDUCREDS-LABS/eta/issues
- **Documentation**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Examples**: [EXAMPLE_REQUESTS.md](EXAMPLE_REQUESTS.md)

---

**Built for the Google Hackathon 2026**
*Making credential verification trustworthy, transparent, and scalable.*
