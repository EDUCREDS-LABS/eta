# Educreds Trust Agent - Example Requests

## Quick Start Examples

### 1. Verify a Credential (Minimal)

**cURL:**
```bash
curl -X POST http://localhost:3000/api/trust-agent/verify-credential \
  -H "Content-Type: application/json" \
  -d '{
    "institution": "Makerere University",
    "certificate_data": "Bachelor of Science in Computer Science"
  }'
```

**JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:3000/api/trust-agent/verify-credential', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    institution: 'Makerere University',
    certificate_data: 'Bachelor of Science in Computer Science'
  })
});
const data = await response.json();
console.log(data.status, data.confidence);
```

**Python:**
```python
import requests

response = requests.post(
    'http://localhost:3000/api/trust-agent/verify-credential',
    json={
        'institution': 'Makerere University',
        'certificate_data': 'Bachelor of Science in Computer Science'
    }
)
print(response.json())
```

---

### 2. Verify with Full PoIC Dimensions

**cURL:**
```bash
curl -X POST http://localhost:3000/api/trust-agent/verify-credential \
  -H "Content-Type: application/json" \
  -d '{
    "institution": "University of Cape Town",
    "certificate_data": "MSc Computer Science",
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE",
    "poicInput": {
      "institutionId": "inst_uct_za",
      "institutionName": "University of Cape Town",
      "dimension1": {
        "governmentRegistrationConfidence": 0.95,
        "accreditationCredibility": 0.9,
        "accreditationStability": 0.88,
        "legalRiskProbability": 0.05
      },
      "dimension2": {
        "digitalFootprintLongevity": 0.85,
        "facultyVerifiability": 0.88,
        "publicRegistryConsistency": 0.9,
        "studentBodyEvidence": 0.85,
        "infrastructureSignals": 0.92
      },
      "dimension3": {
        "issuanceStabilityIndex": 0.85,
        "entropyScore": 0.15,
        "anomalyScore": 0.08,
        "revocationRatio": 0.03
      },
      "dimension4": {
        "verificationRate": 0.97,
        "verificationDiversity": 0.85,
        "reverificationRate": 0.92,
        "failedVerifications": 0.01
      },
      "dimension5": {
        "baseScore": 88,
        "disputeCount": 0,
        "severityLevel": "none",
        "slashingRatioPct": 0
      }
    }
  }'
```

---

### 3. Analyze a Dispute

**cURL:**
```bash
curl -X POST http://localhost:3000/api/trust-agent/analyze-risk \
  -H "Content-Type: application/json" \
  -d '{
    "type": "dispute",
    "disputePayload": {
      "institutionId": "inst_unknown_1",
      "title": "Suspicious credential spike",
      "description": "Institution issued 5000 credentials in a single day, 10x above normal",
      "severity": "high",
      "category": "fraud",
      "evidence": [
        {
          "type": "metrics",
          "description": "Daily issuance: 5000 vs avg 500"
        },
        {
          "type": "report",
          "description": "Multiple verifier complaints about incomplete metadata"
        }
      ]
    }
  }'
```

---

### 4. Analyze a Governance Proposal

**cURL:**
```bash
curl -X POST http://localhost:3000/api/trust-agent/analyze-risk \
  -H "Content-Type: application/json" \
  -d '{
    "type": "governance",
    "governancePayload": {
      "proposalId": "gov_prop_001",
      "title": "Increase institution issuance cap to 50,000/month",
      "description": "Request to increase monthly issuance limit from 10,000 to 50,000 credentials",
      "changes": {
        "issuanceCap": {
          "from": 10000,
          "to": 50000
        },
        "monitoringInterval": {
          "from": "monthly",
          "to": "quarterly"
        }
      },
      "institutionId": "inst_makerere_ug"
    }
  }'
```

---

### 5. With API Key Authentication

**cURL:**
```bash
curl -X POST http://localhost:3000/api/trust-agent/verify-credential \
  -H "Authorization: Bearer sk_live_abc123xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "institution": "Harvard University",
    "certificate_data": "PhD in Physics"
  }'
```

---

### 6. Check Health & Version

**cURL:**
```bash
# Health check
curl http://localhost:3000/api/trust-agent/health

# PoIC Model Version
curl http://localhost:3000/api/trust-agent/poic/version
```

**Response (health):**
```json
{
  "status": "ok",
  "service": "educreds_trust_agent"
}
```

**Response (version):**
```json
{
  "version": "1.0.0",
  "hash": "sha256:abc123...",
  "loadedAt": "2026-05-03T16:00:00.000Z",
  "description": "PoIC Computation Model - Formula-based institutional credibility scoring"
}
```

---

## Integration Examples

### Postman Collection (JSON)

Import this into Postman:

```json
{
  "info": {
    "name": "Educreds Trust Agent API",
    "description": "Hackathon-ready credential verification endpoints",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Verify Credential - Minimal",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"institution\": \"Makerere University\",\n  \"certificate_data\": \"Bachelor of Science in Computer Science\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/trust-agent/verify-credential",
          "host": ["{{base_url}}"],
          "path": ["api", "trust-agent", "verify-credential"]
        }
      }
    },
    {
      "name": "Verify Credential - Full",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"institution\": \"University of Cape Town\",\n  \"certificate_data\": \"MSc Computer Science\",\n  \"wallet\": \"0x742d35Cc6634C0532925a3b844Bc9e7595f42bE\",\n  \"poicInput\": {...}\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/trust-agent/verify-credential",
          "host": ["{{base_url}}"],
          "path": ["api", "trust-agent", "verify-credential"]
        }
      }
    },
    {
      "name": "Analyze Risk - Dispute",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"type\": \"dispute\",\n  \"disputePayload\": {...}\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/trust-agent/analyze-risk",
          "host": ["{{base_url}}"],
          "path": ["api", "trust-agent", "analyze-risk"]
        }
      }
    },
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{base_url}}/api/trust-agent/health",
          "host": ["{{base_url}}"],
          "path": ["api", "trust-agent", "health"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000",
      "type": "string"
    }
  ]
}
```

---

### Node.js TypeScript Client

```typescript
import axios from 'axios';

class EtaClient {
  private baseURL: string;
  private apiKey?: string;

  constructor(baseURL = 'http://localhost:3000', apiKey?: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async verifyCredential(institution: string, certificateData: string) {
    const response = await axios.post(
      `${this.baseURL}/api/trust-agent/verify-credential`,
      { institution, certificate_data: certificateData },
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async analyzeDispute(
    institutionId: string,
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ) {
    const response = await axios.post(
      `${this.baseURL}/api/trust-agent/analyze-risk`,
      {
        type: 'dispute',
        disputePayload: {
          institutionId,
          title,
          description,
          severity,
          category: 'fraud'
        }
      },
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async health() {
    const response = await axios.get(
      `${this.baseURL}/api/trust-agent/health`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }
}

// Usage
const client = new EtaClient('http://localhost:3000');
const result = await client.verifyCredential(
  'Makerere University',
  'Bachelor of Science in Computer Science'
);
console.log(`Status: ${result.status}, Confidence: ${result.confidence}%`);
```

---

### Python Client

```python
import requests
from typing import Optional, Dict, Any

class EtaClient:
    def __init__(self, base_url: str = 'http://localhost:3000', api_key: Optional[str] = None):
        self.base_url = base_url
        self.api_key = api_key
    
    def _headers(self) -> Dict[str, str]:
        headers = {'Content-Type': 'application/json'}
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        return headers
    
    def verify_credential(self, institution: str, certificate_data: str) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/api/trust-agent/verify-credential',
            json={'institution': institution, 'certificate_data': certificate_data},
            headers=self._headers()
        )
        return response.json()
    
    def analyze_dispute(self, institution_id: str, title: str, description: str, severity: str) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/api/trust-agent/analyze-risk',
            json={
                'type': 'dispute',
                'disputePayload': {
                    'institutionId': institution_id,
                    'title': title,
                    'description': description,
                    'severity': severity,
                    'category': 'fraud'
                }
            },
            headers=self._headers()
        )
        return response.json()
    
    def health(self) -> Dict[str, Any]:
        response = requests.get(
            f'{self.base_url}/api/trust-agent/health',
            headers=self._headers()
        )
        return response.json()

# Usage
client = EtaClient()
result = client.verify_credential(
    'Makerere University',
    'Bachelor of Science in Computer Science'
)
print(f"Status: {result['status']}, Confidence: {result['confidence']}%")
```

---

## Testing

Run automated tests:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/tests/TrustAgent.regression.test.ts

# Run with coverage
npm test -- --coverage
```

---

## Troubleshooting

### 400 Bad Request: "Invalid request payload"

Check that:
- `institution` field is required and non-empty
- All numeric values are between 0-1 (or 0-100 for scores)
- `severity` is one of: `low`, `medium`, `high`, `critical`

### 503 Service Unavailable

- Job queue is full → wait and retry
- LLM service is down → check `.env` LLM configuration

### 504 Timeout

- Chat requests exceed 60-second limit
- LLM is slow → increase timeout or use simpler requests
