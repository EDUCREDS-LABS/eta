import dotenv from "dotenv";

dotenv.config({ path: process.env.TRUST_AGENT_ENV_PATH || ".env" });

const rawAllowedOrigins = (
  process.env.TRUST_AGENT_ALLOWED_ORIGINS ||
  process.env.TRUST_AGENT_FRONTEND_URL ||
  process.env.FRONTEND_URL ||
  "*"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  port: parseInt(process.env.TRUST_AGENT_PORT || "3010", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.TRUST_AGENT_FRONTEND_URL || process.env.FRONTEND_URL || "*",
  allowedOrigins: rawAllowedOrigins,
  apiKey: process.env.TRUST_AGENT_API_KEY || "",
  rateLimit: {
    windowMs: parseInt(process.env.TRUST_AGENT_RATE_LIMIT_WINDOW_MS || "60000", 10),
    maxRequests: parseInt(process.env.TRUST_AGENT_RATE_LIMIT_MAX || "60", 10)
  },
  llm: {
    provider: process.env.TRUST_AGENT_LLM_PROVIDER || "openai",
    apiKey: process.env.TRUST_AGENT_LLM_API_KEY || process.env.MISTRAL_API_KEY,
    baseUrl: process.env.TRUST_AGENT_LLM_BASE_URL,
    model: process.env.TRUST_AGENT_LLM_MODEL || "gpt-4.1",
    requestTimeoutMs: parseInt(process.env.TRUST_AGENT_LLM_REQUEST_TIMEOUT_MS || "30000", 10),
    maxConcurrentRequests: parseInt(process.env.TRUST_AGENT_MAX_CONCURRENT_LLM_REQUESTS || "4", 10)
  },
  multiModel: {
    enabled: process.env.TRUST_AGENT_MULTI_MODEL_ENABLED === "true",
    ollama: {
      enabled: process.env.TRUST_AGENT_OLLAMA_ENABLED === "true",
      baseUrl: process.env.TRUST_AGENT_OLLAMA_BASE_URL || "http://localhost:11434/v1",
      model: process.env.TRUST_AGENT_OLLAMA_MODEL || "mistral"
    },
    mistral: {
      enabled: process.env.TRUST_AGENT_MISTRAL_ENABLED === "true",
      apiKey: process.env.TRUST_AGENT_MISTRAL_API_KEY || process.env.MISTRAL_API_KEY,
      model: process.env.TRUST_AGENT_MISTRAL_MODEL || "mistral-small"
    }
  },
  queue: {
    maxWorkers: parseInt(process.env.TRUST_AGENT_QUEUE_MAX_WORKERS || "2", 10),
    maxQueueLength: parseInt(process.env.TRUST_AGENT_QUEUE_MAX_LENGTH || "20", 10),
    historyTtlMs: parseInt(process.env.TRUST_AGENT_QUEUE_HISTORY_TTL_MS || "3600000", 10)
  },
  poic: {
    localFilePath: process.env.TRUST_AGENT_POIC_LOCAL_PATH || "../../../educreds-protocol/PoIC.md",
    liveUrl:
      process.env.TRUST_AGENT_POIC_LIVE_URL ||
      "https://docs.educreds.xyz/educreds/governance-institution-approval-and-poic-bootstrap/poic-computation",
    enableAutoSync: process.env.TRUST_AGENT_POIC_SYNC_ENABLED === "true",
    syncIntervalMinutes: parseInt(process.env.TRUST_AGENT_POIC_SYNC_INTERVAL_MINUTES || "360", 10)
  }
};

// Debug logging
// eslint-disable-next-line no-console
console.log("[config] nodeEnv:", config.nodeEnv);
// eslint-disable-next-line no-console
console.log("[config] LLM provider:", config.llm.provider);
// eslint-disable-next-line no-console
console.log("[config] LLM model:", config.llm.model);
if (config.multiModel.enabled) {
  // eslint-disable-next-line no-console
  console.log("[config] Multi-model routing ENABLED");
  if (config.multiModel.ollama.enabled) {
    // eslint-disable-next-line no-console
    console.log("   - Ollama enabled");
  }
  if (config.multiModel.mistral.enabled) {
    // eslint-disable-next-line no-console
    console.log("   - Mistral enabled for governance reasoning");
  }
}

if (!config.llm.apiKey && config.llm.provider !== "ollama") {
  // We don't throw here to allow container to boot, but log so ops can see it.
  // eslint-disable-next-line no-console
  console.warn(
    "[educreds_trust_agent] LLM API key is not set. Set TRUST_AGENT_LLM_API_KEY or OPENAI_API_KEY.",
  );
}

if (config.nodeEnv === "production" && config.allowedOrigins.includes("*")) {
  // eslint-disable-next-line no-console
  console.warn(
    "[config] Production environment should not use wildcard CORS origins. Set TRUST_AGENT_ALLOWED_ORIGINS explicitly.",
  );
}
