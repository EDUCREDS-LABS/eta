# Trust Agent 401 Fix Guide

## Issue Confirmed ✓
- **Error**: `Status 401 - Unauthorized` from Mistral API
- **API Key**: `i2ncxmXzGky6wMMQbeIgfFRFQmd0WknG` (INVALID/EXPIRED)
- **Location**: Agent chat request failing at LLM completion

## Solution Options

### Option 1: Update Mistral API Key (Recommended if you have valid key)
1. Get a valid API key from: https://console.mistral.ai/api-keys
2. Replace the key in `.env`:
   ```
   TRUST_AGENT_LLM_API_KEY=<your-valid-key-here>
   TRUST_AGENT_MISTRAL_API_KEY=<your-valid-key-here>  
   ```

### Option 2: Switch to Ollama (Recommended for production reliability)
Ollama doesn't require API keys and runs locally:

```bash
# Update .env
TRUST_AGENT_LLM_PROVIDER=ollama
TRUST_AGENT_LLM_BASE_URL=http://localhost:11434/v1
TRUST_AGENT_LLM_MODEL=mistral

# Ensure Ollama is running
ollama serve

# In another terminal, pull the model
ollama pull mistral
```

### Option 3: Switch to OpenAI
```bash
# Update .env
TRUST_AGENT_LLM_PROVIDER=openai
TRUST_AGENT_LLM_API_KEY=sk-<your-openai-key>
TRUST_AGENT_LLM_BASE_URL=https://api.openai.com/v1
TRUST_AGENT_LLM_MODEL=gpt-4
```

### Option 4: Use Multi-Model with Fallback (Most Robust)
Already configured in .env - when Mistral fails, it falls back to Ollama:
```bash
TRUST_AGENT_MULTI_MODEL_ENABLED=true
TRUST_AGENT_MISTRAL_ENABLED=true
TRUST_AGENT_MISTRAL_API_KEY=<valid-key>
TRUST_AGENT_OLLAMA_ENABLED=true
TRUST_AGENT_OLLAMA_BASE_URL=http://localhost:11434/v1
```

## Additional Fixes Needed

### Fix 1: Remove Duplicated Environment Variables
Your `.env` file has duplicate entries. Use the provided `.env.fixed` instead.

### Fix 2: Restart the Service
After updating `.env`, restart or redeploy:
```bash
npm run build && npm start
```

## Verification
Run the diagnostic test to verify the fix works:
```bash
npm run build && npx ts-node-dev --respawn --transpile-only test-mistral-auth.ts
```

Expected output on success:
```
✅ Connection successful!
Response: Authentication successful!
✅ Mistral API authentication is working correctly.
```
