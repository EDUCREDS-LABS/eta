# Educreds Trust Agent (ETA) - API Documentation

## Overview

Eta is a modular AI trust engine that provides institutional credibility scoring and credential verification. It exposes a **hackathon-friendly API abstraction layer** designed for integration with Google Agent Builder and other AI orchestration platforms.

## Core Endpoints (Hackathon-Focused)

### 1. POST `/api/trust-agent/verify-credential`

**Hero endpoint for credential verification flow**

Combines PoIC computation, behavioral analysis, and credential risk assessment into a single unified call.

#### Request

```json
{
  "institution": "Makerere University",
  "certificate_data": "Bachelor of Science in Computer Science",
  "wallet": "0x1234...",
  "poicInput": {
    "institutionId": "inst_makerere_ug",
    "institutionName": "Makerere University",
    "dimension1": {
      "governmentRegistrationConfidence": 0.9,
      "accreditationCredibility": 0.85,
      "accreditationStability": 0.8,
      "legalRiskProbability": 0.1
    },
    "dimension2": {
      "digitalFootprintLongevity": 0.75,
      "facultyVerifiability": 0.8,
      "publicRegistryConsistency": 0.85,
      "studentBodyEvidence": 0.8,
      "infrastructureSignals": 0.9
    },
    "dimension3": {
      "issuanceStabilityIndex": 0.8,
      "entropyScore": 0.2,
      "anomalyScore": 0.1,
      "revocationRatio": 0.05
    },
    "dimension4": {
      "verificationRate": 0.95,
      "verificationDiversity": 0.8,
      "reverificationRate": 0.9,
      "failedVerifications": 0.02
    },
    "dimension5": {
      "baseScore": 85,
      "disputeCount": 0,
      "severityLevel": "none",
      "slashingRatioPct": 0
    }
  }
}
```

#### Response (200 OK)

```json
{
  "status": "verified",
  "confidence": 87,
  "risk_flags": [
    "Verify faculty credentials independently",
    "Cross-check accreditation status"
  ],
  "explanation": "PoIC master score: 87 Behavior risk score: 45 Credential risk score: 40 Institution demonstrates strong operational authenticity with minimal behavioral anomalies.",
  "steps": [
    "Checked institutional PoIC score",
    "Analyzed behavioral risk",
    "Validated credential metadata"
  ],
  "details": {
    "poic": {
      "masterScore": 87,
      "governanceRecommendation": "APPROVE",
      "issuanceCapacity": {
        "tier": "EXTENDED",
        "maxIssuances": 10000,
        "description": "Approved for extended issuance with periodic monitoring"
      }
    },
    "behavior": {
      "aiRiskScore": 45,
      "summary": "Stable behavioral patterns with consistent verification rates",
      "drivers": [
        "High issuance volume with low revocation ratio",
        "Strong verification diversity"
      ],
      "recommendations": [
        "Continue quarterly behavior monitoring",
        "Review revocation patterns annually"
      ]
    },
    "credentialAnalysis": {
      "summary": "Credential metadata is consistent with institutional profile",
      "riskScore": 40,
      "recommendations": [
        "Recommend additional verifier feedback"
      ]
    }
  }
}
```

---

### 2. POST `/api/trust-agent/analyze-risk`

**Risk analysis endpoint for disputes and governance proposals**

```json
{
  "type": "dispute",
  "disputePayload": {
    "institutionId": "inst_1",
    "title": "Credential authenticity concern",
    "description": "Multiple reports of unverified credentials issued by this institution",
    "severity": "high",
    "category": "fraud",
    "evidence": [
      {
        "type": "report",
        "description": "Employee credential verification failed"
      }
    ]
  }
}
```

**Response:**

```json
{
  "type": "dispute",
  "result": {
    "riskScore": 72,
    "recommendedAction": "audit",
    "confidence": "high",
    "summary": "Multiple unverified credential reports suggest systematic issuance control issues",
    "evidenceReview": "Pattern consistent with institutional oversight failure",
    "recommendations": [
      "Initiate formal audit of credential issuance process",
      "Review verifier feedback patterns",
      "Implement additional verification requirements"
    ]
  }
}
```

---

## Internal System Endpoints (Keep Private)

These endpoints are used internally and should **not** be exposed to Agent Builder:

- `POST /api/trust-agent/poic/compute` — Raw PoIC calculation (use via verify-credential)
- `GET /api/trust-agent/poic/version` — Model version metadata
- `POST /api/trust-agent/analyze` — Generic analysis (use via verify-credential)
- `POST /api/trust-agent/institution/onboarding` — Onboarding analysis
- `POST /api/trust-agent/poic/behavior` — Behavioral analysis (use via verify-credential)
- `POST /api/trust-agent/governance/proposal-analysis` — Governance analysis
- `POST /api/trust-agent/disputes/analyze` — Dispute analysis (use via analyze-risk)
- `POST /api/trust-agent/chat` — Chat interface
- `GET /api/trust-agent/jobs/:jobId` — Job status lookup
- `GET /api/trust-agent/health` — Health check

---

## PoIC Scoring Explained

The **Proof of Institutional Credibility (PoIC)** score (0-100) combines five dimensions:

- **D1 (25%)**: Legal & Accreditation Status
- **D2 (20%)**: Operational Authenticity
- **D3 (25%)**: Issuance Behavior Quality
- **D4 (15%)**: Verification & Feedback
- **D5 (15%)**: Governance & Dispute History

**Score Bands:**

- **80-100**: APPROVE — Full issuance capability
- **70-79**: APPROVE_WITH_MONITORING — Monitor quarterly
- **50-69**: RESTRICT_ISSUANCE — Limited caps
- **0-49**: SUSPEND — Investigation required

---

## Authentication

Add API key to requests:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"institution":"..."}' \
  https://eta-api.educreds.io/api/trust-agent/verify-credential
```

---

## Rate Limiting

- **Default**: 100 requests per minute per API key
- **Burst**: Up to 150 in any 10-second window
- **Timeout**: 60 seconds for chat requests

---

## Error Handling

### 400 Bad Request

```json
{
  "message": "Invalid request payload",
  "issues": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "path": ["institution"],
      "message": "String must contain at least 1 character(s)"
    }
  ]
}
```

### 503 Service Unavailable

```json
{
  "message": "Service busy, try again later"
}
```

### 500 Internal Server Error

```json
{
  "message": "Internal server error",
  "error": "LLM service unavailable"
}
```

---

## Integration with Google Agent Builder

### Step 1: Register Tools in Vertex AI

```json
{
  "tools": [
    {
      "function_declarations": [
        {
          "name": "verify_credential",
          "description": "Verify institutional credibility and credential authenticity",
          "parameters": {
            "type": "object",
            "properties": {
              "institution": {
                "type": "string",
                "description": "Institution name"
              },
              "certificate_data": {
                "type": "string",
                "description": "Credential details (e.g., degree, field)"
              },
              "wallet": {
                "type": "string",
                "description": "Holder wallet address (optional)"
              }
            },
            "required": ["institution"]
          }
        },
        {
          "name": "analyze_risk",
          "description": "Analyze institutional risk flags or governance concerns",
          "parameters": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "enum": ["dispute", "governance"],
                "description": "Analysis type"
              },
              "title": {
                "type": "string",
                "description": "Risk title"
              },
              "description": {
                "type": "string",
                "description": "Detailed description"
              }
            },
            "required": ["type", "title"]
          }
        }
      ]
    }
  ]
}
```

### Step 2: Gemini Makes Decisions

```
User: "Verify this certificate from Makerere University"

Gemini thinks:
  → Task: Credential verification
  → Tool: verify_credential
  → Params: { institution: "Makerere University", ... }

Eta (backend):
  → Computes PoIC score (87)
  → Analyzes behavioral patterns (risk: 45)
  → Returns: { status: "verified", confidence: 87, ... }

Gemini returns:
  "✅ Verified with 87% confidence. Institution is approved for credential issuance with monitoring."
```

---

## Example: Full Demo Flow

**User Query:**
```
"Is a Bachelor of Science from Makerere University legitimate?"
```

**Gemini Agent:**
1. Recognizes credential verification task
2. Calls `/api/trust-agent/verify-credential`
3. Receives structured response with confidence score
4. Interprets risk flags and behavioral insights
5. Provides human-friendly answer with transparency

**Output:**
```
✅ This credential appears legitimate.

Institution: Makerere University
Confidence: 87%

Institutional Credibility:
- PoIC Score: 87/100 (Strong)
- Status: APPROVED for credential issuance
- Issuance Capacity: 10,000 per month

Behavioral Analysis:
- Risk Level: Low (45/100)
- Pattern: Stable, consistent verification rates
- Recommendation: Continue quarterly monitoring

Reasoning Steps:
1. ✓ Checked institutional PoIC score
2. ✓ Analyzed behavioral risk
3. ✓ Validated credential metadata

Caveats:
- Verify faculty credentials independently
- Cross-check current accreditation status
```

---

## Support & Questions

- **Repository**: https://github.com/EDUCREDS-LABS/eta
- **Issues**: https://github.com/EDUCREDS-LABS/eta/issues
- **Documentation**: See README.md for architecture overview
