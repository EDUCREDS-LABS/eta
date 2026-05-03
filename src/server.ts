import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { json } from "body-parser";
import { config } from "./config";
import { agentRoutes } from "./routes/agentRoutes";
import { DocumentationService } from "./services/DocumentationService";
import { PoICDataService } from "./services/PoICDataService";
import { poicVersionManager } from "./services/PoICVersionManager";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class SimpleRateLimiter {
  private entries = new Map<string, RateLimitEntry>();

  constructor(private readonly maxRequests: number, private readonly windowMs: number) {}

  allow(key: string): boolean {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || entry.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count += 1;
    return true;
  }
}

const rateLimiter = new SimpleRateLimiter(
  config.rateLimit.maxRequests,
  config.rateLimit.windowMs
);

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (config.nodeEnv !== "production" && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
        return callback(null, true);
      }

      if (config.allowedOrigins.includes("*") && config.nodeEnv !== "production") {
        return callback(null, true);
      }

      if (config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(json({ limit: "1mb" }));

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!config.apiKey) {
    return next();
  }

  const authHeader = req.headers.authorization as string | undefined;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : (req.headers["x-api-key"] as string | undefined);

  if (!token || token !== config.apiKey) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization as string | undefined;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : (req.headers["x-api-key"] as string | undefined);
  const key = token || req.ip || "anonymous";

  if (!rateLimiter.allow(key)) {
    return res.status(429).json({ message: "Too many requests" });
  }

  return next();
});

app.use("/api/trust-agent", agentRoutes);

app.get("/", (_req, res) => {
  res.json({
    name: "educreds_trust_agent",
    status: "ok",
    docs: "/api/trust-agent/health"
  });
});

// Pre-load documentation on startup to avoid hanging on first chat request
const docService = new DocumentationService();
const poicDataService = new PoICDataService();

async function startServer() {
  try {
    console.log("[server] Initializing PoIC services...");
    await poicDataService.initialize();

    if (config.nodeEnv === "production" || config.poic.enableAutoSync) {
      console.log("[server] Starting PoIC periodic syncing...");
      poicDataService.startPeriodicSync();
    }
    console.log("[server] PoIC services initialized successfully");
  } catch (error) {
    console.error("[server] Failed during PoIC initialization:", error);
    console.log("[server] Continuing startup with cached PoIC data if available");
  }

  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[educreds_trust_agent] listening on port ${config.port} (env=${config.nodeEnv})`
    );

    try {
      const versionInfo = poicVersionManager.getVersionMetadata();
      console.log(`[educreds_trust_agent] PoIC Model: ${versionInfo.version}, Hash: ${versionInfo.versionHash}`);
    } catch (error) {
      console.warn("[educreds_trust_agent] PoIC version info not available");
    }
  });

  docService.loadDocs()
    .then(() => {
      console.log("[server] Documentation pre-loaded successfully");
    })
    .catch((error) => {
      console.error("[server] Documentation pre-loading failed:", error);
    });

  const shutdown = () => {
    console.log('[server] Shutdown signal received, stopping services');
    poicDataService.stopPeriodicSync();
    server.close(() => {
      console.log('[server] HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => {
      console.warn('[server] Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((error) => {
  console.error('[server] Failed to start:', error);
  process.exit(1);
});
