import OpenAI from "openai";
import { Mistral } from "@mistralai/mistralai";
import { config } from "../config";

// Dynamic import for node-fetch (ESM module compatibility)
const fetch = eval("require('node-fetch')");

export interface LLMCompletionInput {
  system: string;
  user: string;
}

export type TaskType = "GOVERNANCE_ADVICE" | "CREDENTIAL_RISK_ANALYSIS" | "ETA_PROMPT" | "POIC_CALCULATION" | "FREEFORM";

export interface TrustLLMClient {
  // LLM outputs are advisory/supplementary and do not replace formula-based PoIC calculations.
  complete(input: LLMCompletionInput): Promise<string>;
  getModel(): string;
  getProvider(): string;
}

class ConcurrencyLimiter {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active < this.maxConcurrent) {
      this.active += 1;
      try {
        return await fn();
      } finally {
        this.active -= 1;
        this.dequeue();
      }
    }

    return new Promise<T>((resolve, reject) => {
      const execute = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.active -= 1;
          this.dequeue();
        }
      };
      this.queue.push(execute);
    });
  }

  private dequeue(): void {
    if (this.queue.length === 0 || this.active >= this.maxConcurrent) {
      return;
    }
    const next = this.queue.shift();
    if (next) {
      this.active += 1;
      next();
    }
  }
}

/** OpenAI implementation */
class OpenAIClient implements TrustLLMClient {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseUrl?: string, model?: string) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
    this.model = model || "gpt-4.1";
  }

  async complete(input: LLMCompletionInput): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`OpenAI request timeout after ${config.llm.requestTimeoutMs}ms`)),
        config.llm.requestTimeoutMs
      )
    );

    try {
      const response = await Promise.race([
        this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user }
          ],
          temperature: 0.2
        }),
        timeoutPromise
      ]);

      return (response as any).choices?.[0]?.message?.content ?? "";
    } catch (error: any) {
      throw error;
    }
  }

  getModel(): string {
    return this.model;
  }

  getProvider(): string {
    return "openai";
  }
}

/** Gemini implementation */
class GeminiClient implements TrustLLMClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || "gemini-2.0-flash";
  }

  async complete(input: LLMCompletionInput): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: `${input.system}\n${input.user}` }]
              }
            ]
          })
        }
      );

      const data: any = await response.json();
      console.log("[GeminiClient] Raw API response:", JSON.stringify(data, null, 2));

      if (data?.error) {
        console.error("[GeminiClient] API Error:", data.error);
        return `Error from AI provider: ${data.error?.message ?? 'Unknown error'}`;
      }

      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[GeminiClient] Request timeout after 30 seconds');
        return 'Error: AI provider request timeout';
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  getModel(): string {
    return this.model;
  }

  getProvider(): string {
    return "gemini";
  }
}

/** Mistral implementation */
class MistralClient implements TrustLLMClient {
  private client: Mistral;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Mistral({ apiKey });
    this.model = model || "mistral-tiny"; // default model
  }

  async complete(input: LLMCompletionInput): Promise<string> {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Mistral API request timeout after 30 seconds')), 30000)
      );

      // Race the Mistral request against the timeout
      const response = await Promise.race([
        this.client.chat.complete({
          model: this.model,
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user }
          ]
        }),
        timeoutPromise
      ]);

      const content = response.choices[0]?.message?.content;

      if (typeof content === "string") {
        return content;
      }

      if (Array.isArray(content)) {
        return content
          .map(chunk => {
            // Handle different chunk types (text, image, etc.)
            if (typeof chunk === 'object' && chunk !== null && 'text' in chunk) {
              return (chunk as { text?: string }).text ?? "";
            }
            if (typeof chunk === 'string') {
              return chunk;
            }
            return "";
          })
          .join(" ");
      }

      return "";
    } catch (error: any) {
      console.error('[MistralClient] Error:', error.message);
      throw error;
    }
  }

  getModel(): string {
    return this.model;
  }

  getProvider(): string {
    return "mistral";
  }
}

/** Ollama local inference implementation (OpenAI-compatible) */
class OllamaClient implements TrustLLMClient {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.model = model || "mistral";
  }

  async complete(input: LLMCompletionInput): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for local inference

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[OllamaClient] HTTP ${response.status}:`, error);
        throw new Error(`Ollama API error: ${response.status} ${error}`);
      }

      const data: any = await response.json();
      return data?.choices?.[0]?.message?.content ?? "";
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error("[OllamaClient] Request timeout after 60 seconds");
        return "Error: Ollama inference timeout (model may be too large)";
      }
      console.error("[OllamaClient] Error:", error.message);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  getModel(): string {
    return this.model;
  }

  getProvider(): string {
    return "ollama";
  }
}

/** Smith Router: Intelligent task-to-model routing */
class ModelRouter {
  private primaryClient: TrustLLMClient;
  private fallbackClient: TrustLLMClient;
  private ollamaClient: TrustLLMClient | null = null;
  private mistralClient: TrustLLMClient | null = null;
  private concurrencyLimiter = new ConcurrencyLimiter(config.llm.maxConcurrentRequests);

  constructor(primary: TrustLLMClient, fallback: TrustLLMClient, ollama?: TrustLLMClient, mistral?: TrustLLMClient) {
    this.primaryClient = primary;
    this.fallbackClient = fallback;
    this.ollamaClient = ollama || null;
    this.mistralClient = mistral || null;
  }

  /**
   * Route task to the optimal model based on task type
   * - POIC_CALCULATION: Ollama (local, consistent, no API costs)
   * - GOVERNANCE_ADVICE: Mistral (strong reasoning) → Ollama (fallback)
   * - CREDENTIAL_RISK_ANALYSIS: Mistral (analytical) → Ollama (fallback)
   * - ETA_PROMPT: Ollama (local & fast) → Primary
   * - FREEFORM: Primary → Fallback
   */
  async selectAndComplete(input: LLMCompletionInput, taskType: TaskType): Promise<string> {
    let selectedClient: TrustLLMClient;

    switch (taskType) {
      case "POIC_CALCULATION":
        // PoIC calculations benefit from local, consistent inference
        selectedClient = this.ollamaClient || this.primaryClient;
        break;

      case "GOVERNANCE_ADVICE":
        // Mistral excels at governance reasoning; Ollama as fallback
        selectedClient = this.mistralClient || this.ollamaClient || this.primaryClient;
        break;

      case "CREDENTIAL_RISK_ANALYSIS":
        // Risk analysis needs strong analytical reasoning
        selectedClient = this.mistralClient || this.ollamaClient || this.primaryClient;
        break;

      case "ETA_PROMPT":
        // ETA prompts work well with Ollama for speed; fallback to primary
        selectedClient = this.ollamaClient || this.primaryClient;
        break;

      case "FREEFORM":
      default:
        // General queries use primary model
        selectedClient = this.primaryClient;
    }

    try {
      console.log(
        `[ModelRouter] Routing ${taskType} to ${selectedClient.getProvider()}:${selectedClient.getModel()}`
      );
      return await this.concurrencyLimiter.run(() => selectedClient.complete(input));
    } catch (error: any) {
      console.warn(
        `[ModelRouter] ${selectedClient.getProvider()} failed:`,
        error.message,
        "– falling back to primary"
      );
      if (selectedClient !== this.primaryClient) {
        return await this.concurrencyLimiter.run(() => this.primaryClient.complete(input));
      }
      throw error;
    }
  }

  async complete(input: LLMCompletionInput): Promise<string> {
    return this.selectAndComplete(input, "FREEFORM");
  }

  getModel(): string {
    return this.primaryClient.getModel();
  }

  getProvider(): string {
    return this.primaryClient.getProvider();
  }
}

/** Factory */
export function createLLMClient(): TrustLLMClient {
  const { provider, apiKey, baseUrl, model } = config.llm;
  const multiModel = config.multiModel;

  // Create all available client instances
  let ollamaClient: TrustLLMClient | null = null;
  let mistralClient: TrustLLMClient | null = null;
  let primaryClient: TrustLLMClient;

  // Initialize Ollama if configured
  if (multiModel.ollama.enabled && multiModel.ollama.baseUrl) {
    try {
      ollamaClient = new OllamaClient(multiModel.ollama.baseUrl, multiModel.ollama.model);
      console.log("[llmClient] Ollama enabled:", multiModel.ollama.baseUrl);
    } catch (error: any) {
      console.warn("[llmClient] Failed to initialize Ollama:", error.message);
    }
  }

  // Initialize Mistral if configured
  if (multiModel.mistral.enabled && multiModel.mistral.apiKey) {
    try {
      mistralClient = new MistralClient(multiModel.mistral.apiKey, multiModel.mistral.model);
      console.log("[llmClient] Mistral enabled for specialized reasoning");
    } catch (error: any) {
      console.warn("[llmClient] Failed to initialize Mistral:", error.message);
    }
  }

  // Create primary client based on config
  if (provider === "mistral") {
    if (!apiKey) {
      throw new Error(
        "Missing apiKey for Mistral provider. Set MISTRAL_API_KEY or TRUST_AGENT_LLM_API_KEY."
      );
    }
    primaryClient = new MistralClient(apiKey, model);
  } else if (provider === "gemini" || provider === "google") {
    if (!apiKey) {
      throw new Error("Missing apiKey for Gemini provider");
    }
    primaryClient = new GeminiClient(apiKey, model);
  } else if (provider === "ollama") {
    if (!baseUrl) {
      throw new Error(
        "Missing baseUrl for Ollama provider. Set TRUST_AGENT_LLM_BASE_URL (e.g., http://localhost:11434/v1)"
      );
    }
    primaryClient = new OllamaClient(baseUrl, model);
  } else {
    // Default to OpenAI-compatible
    if (!apiKey) {
      throw new Error("Missing apiKey for OpenAI provider");
    }
    if (!baseUrl) {
      throw new Error("Missing baseUrl for OpenAI provider. Please set llm.baseUrl in your configuration.");
    }
    primaryClient = new OpenAIClient(apiKey, baseUrl, model);
  }

  // If multi-model routing is enabled, return a router; otherwise return the primary client
  if (multiModel.enabled) {
    return new ModelRouter(primaryClient, primaryClient, ollamaClient || undefined, mistralClient || undefined);
  }

  return primaryClient;
}
/** Export router for access to task-specific routing */
export { ModelRouter };
