import express, { Request, Response } from "express";
import { z } from "zod";
import {
  CredentialContextSchema,
  DisputeAnalysisRequestSchema,
  EducredsTrustAgent,
  GovernanceContextSchema,
  GovernanceProposalAnalysisRequestSchema,
  InstitutionOnboardingRequestSchema,
  PoicBehaviorRequestSchema,
  TrustAnalysisRequestSchema,
  ChatRequestSchema
} from "../agent/trustAgent";
import { createLLMClient } from "../services/llmClient";
import { JobQueueService } from "../services/JobQueueService";
import { PoICEndpointService } from "../services/PoICEndpointService";
import { poicVersionManager } from "../services/PoICVersionManager";
import { config } from "../config";

const PoICComputeRequestSchema = z.object({
  institutionId: z.string(),
  institutionName: z.string().min(1),
  dimension1: z.object({
    governmentRegistrationConfidence: z.number().min(0).max(1),
    accreditationCredibility: z.number().min(0).max(1),
    accreditationStability: z.number().min(0).max(1),
    legalRiskProbability: z.number().min(0).max(1)
  }),
  dimension2: z.object({
    digitalFootprintLongevity: z.number().min(0).max(1),
    facultyVerifiability: z.number().min(0).max(1),
    publicRegistryConsistency: z.number().min(0).max(1),
    studentBodyEvidence: z.number().min(0).max(1),
    infrastructureSignals: z.number().min(0).max(1)
  }),
  dimension3: z.object({
    issuanceStabilityIndex: z.number().min(0).max(1),
    entropyScore: z.number().min(0).max(1),
    anomalyScore: z.number().min(0).max(1),
    revocationRatio: z.number().min(0).max(1)
  }),
  dimension4: z.object({
    verificationRate: z.number().min(0).max(1),
    verificationDiversity: z.number().min(0).max(1),
    reverificationRate: z.number().min(0).max(1),
    failedVerifications: z.number().min(0).max(1)
  }),
  dimension5: z.object({
    baseScore: z.number().min(0),
    disputeCount: z.number().min(0),
    severityLevel: z.enum(["none", "low", "medium", "high", "critical"]),
    slashingRatioPct: z.number().min(0).max(100)
  }),
  decayCoefficient: z.number().optional(),
  evaluationTimestamp: z.string().datetime().optional()
});

const VerifyCredentialRequestSchema = z.object({
  institution: z.string().min(1),
  certificate_data: z.string().optional(),
  wallet: z.string().optional(),
  poicInput: PoICComputeRequestSchema.optional(),
  behaviorInput: PoicBehaviorRequestSchema.optional(),
  credentialContext: CredentialContextSchema.optional(),
  governanceContext: GovernanceContextSchema.optional()
});

const AnalyzeRiskRequestSchema = z.object({
  type: z.enum(["dispute", "governance"]),
  disputePayload: DisputeAnalysisRequestSchema.optional(),
  governancePayload: GovernanceProposalAnalysisRequestSchema.optional()
});

const router = express.Router();
const agent = new EducredsTrustAgent(createLLMClient());
const poicService = new PoICEndpointService(poicVersionManager);
const jobQueue = new JobQueueService(
  config.queue.maxWorkers,
  config.queue.maxQueueLength,
  config.queue.historyTtlMs
);

// 0) PoIC Computation - Formula-Based (Spec-Compliant)
router.post("/poic/compute", async (req: Request, res: Response) => {
  try {
    console.log("[agentRoutes] /poic/compute request received");

    const parseResult = PoICComputeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid request payload",
        issues: parseResult.error.issues
      });
    }

    // Compute PoIC using formula-based approach
    const result = await poicService.computePoIC(parseResult.data);

    console.log("[agentRoutes] /poic/compute completed successfully");
    return res.json(result);
  } catch (error: any) {
    console.error("[educreds_trust_agent] /poic/compute error", error);
    return res.status(500).json({
      message: "PoIC computation failed",
      error: error.message || "Unknown error occurred"
    });
  }
});

// PoIC Model Version Endpoint
router.get("/poic/version", (req: Request, res: Response) => {
  try {
    console.log("[agentRoutes] /poic/version request received");
    const versionInfo = poicVersionManager.getVersionMetadata();
    return res.json({
      version: versionInfo.version,
      hash: versionInfo.versionHash,
      loadedAt: versionInfo.loadedAt,
      description: "PoIC Computation Model - Formula-based institutional credibility scoring"
    });
  } catch (error: any) {
    console.error("[educreds_trust_agent] /poic/version error", error);
    return res.status(500).json({
      message: "Failed to retrieve PoIC version",
      error: error.message
    });
  }
});

// Wrapper endpoint for hackathon-friendly verification flow
router.post("/verify-credential", async (req: Request, res: Response) => {
  try {
    const parsed = VerifyCredentialRequestSchema.parse(req.body);

    const poicPayload = parsed.poicInput ?? {
      institutionId: parsed.wallet ?? parsed.institution,
      institutionName: parsed.institution,
      dimension1: {
        governmentRegistrationConfidence: 0.5,
        accreditationCredibility: 0.5,
        accreditationStability: 0.5,
        legalRiskProbability: 0.5
      },
      dimension2: {
        digitalFootprintLongevity: 0.5,
        facultyVerifiability: 0.5,
        publicRegistryConsistency: 0.5,
        studentBodyEvidence: 0.5,
        infrastructureSignals: 0.5
      },
      dimension3: {
        issuanceStabilityIndex: 0.5,
        entropyScore: 0.5,
        anomalyScore: 0.5,
        revocationRatio: 0.5
      },
      dimension4: {
        verificationRate: 0.5,
        verificationDiversity: 0.5,
        reverificationRate: 0.5,
        failedVerifications: 0.5
      },
      dimension5: {
        baseScore: 50,
        disputeCount: 0,
        severityLevel: "none",
        slashingRatioPct: 0
      }
    };

    const behaviorPayload = parsed.behaviorInput ?? {
      institutionId: parsed.wallet ?? parsed.institution,
      issuanceMetrics: {
        totalIssued: 0,
        totalRevoked: 0,
        totalFrozen: 0,
        issuanceHistory: []
      },
      feedbackSummary: {},
      governanceParticipationSummary: undefined,
      auditSummary: undefined
    };

    const analysisQuestion = [
      `Institution: ${parsed.institution}`,
      `Wallet: ${parsed.wallet ?? "unknown"}`,
      `Certificate data: ${parsed.certificate_data ?? "N/A"}`,
      "Please evaluate whether this credential issuance context is credible, whether the institution appears trustworthy, and whether any risk factors should be flagged."
    ].join("\n");

    const [poicResult, behaviorResult, analyzeResult] = await Promise.all([
      poicService.computePoIC(poicPayload),
      agent.analyzePoicBehavior(behaviorPayload),
      jobQueue.enqueue("verify-credential:analyze", () =>
        agent.analyze({
          queryType: "CREDENTIAL_RISK_ANALYSIS",
          question: analysisQuestion,
          credentialContext: parsed.credentialContext,
          governanceContext: parsed.governanceContext
        })
      )
    ]);

    const normalizedPoicScore = Math.round(Math.max(0, Math.min(100, poicResult.masterScore)));
    const normalizedBehaviorScore = Math.round(Math.max(0, Math.min(100, behaviorResult.aiRiskScore ?? 50)));
    const normalizedAnalysisScore = Math.round(Math.max(0, Math.min(100, analyzeResult.riskScore ?? 50)));

    const confidenceParts = [normalizedPoicScore, 100 - normalizedBehaviorScore, 100 - normalizedAnalysisScore];
    const confidence = Math.round(
      confidenceParts.reduce((acc, value) => acc + value, 0) / confidenceParts.length
    );

    const riskFlags = Array.from(
      new Set([
        ...(analyzeResult.recommendations ?? []),
        ...(behaviorResult.recommendations ?? []),
        poicResult.governanceAction?.rationale ? [poicResult.governanceAction.rationale] : []
      ].flat())
    ).filter(Boolean);

    const status = confidence >= 70 ? "verified" : confidence >= 40 ? "review" : "unverified";
    const explanation = [
      `PoIC master score: ${normalizedPoicScore}`,
      `Behavior risk score: ${normalizedBehaviorScore}`,
      `Credential risk score: ${normalizedAnalysisScore}`,
      analyzeResult.summary
    ]
      .filter(Boolean)
      .join(" ");

    return res.json({
      status,
      confidence,
      risk_flags: riskFlags,
      explanation,
      steps: [
        "Checked institutional PoIC score",
        "Analyzed behavioral risk",
        "Validated credential metadata"
      ],
      details: {
        poic: {
          masterScore: poicResult.masterScore,
          governanceRecommendation: poicResult.governanceAction?.recommendation,
          issuanceCapacity: poicResult.issuanceCapacity
        },
        behavior: behaviorResult,
        credentialAnalysis: analyzeResult
      }
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Invalid request payload",
        issues: error.issues
      });
    }

    if (error.message && error.message.includes("Job queue full")) {
      return res.status(503).json({ message: "Service busy, try again later" });
    }

    console.error("[educreds_trust_agent] /verify-credential error", error);
    return res.status(500).json({ message: "Internal server error", error: error.message || "Unknown error occurred" });
  }
});

router.post("/analyze-risk", async (req: Request, res: Response) => {
  try {
    const parsed = AnalyzeRiskRequestSchema.parse(req.body);

    if (parsed.type === "dispute") {
      const disputePayload = parsed.disputePayload;
      if (!disputePayload) {
        return res.status(400).json({ message: "disputePayload is required for dispute analysis" });
      }
      const result = await jobQueue.enqueue("analyze-risk:dispute", () =>
        agent.analyzeDispute(disputePayload)
      );
      return res.json({ type: "dispute", result });
    }

    if (parsed.type === "governance") {
      const governancePayload = parsed.governancePayload;
      if (!governancePayload) {
        return res.status(400).json({ message: "governancePayload is required for governance analysis" });
      }
      const result = await jobQueue.enqueue("analyze-risk:governance", () =>
        agent.analyzeGovernanceProposal(governancePayload)
      );
      return res.json({ type: "governance", result });
    }

    return res.status(400).json({ message: "Unsupported analyze-risk type" });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Invalid request payload",
        issues: error.issues
      });
    }

    if (error.message && error.message.includes("Job queue full")) {
      return res.status(503).json({ message: "Service busy, try again later" });
    }

    console.error("[educreds_trust_agent] /analyze-risk error", error);
    return res.status(500).json({ message: "Internal server error", error: error.message || "Unknown error occurred" });
  }
});

// 1) Generic ETA-style analysis (prompt helper, governance/credential advice)
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const parsed = TrustAnalysisRequestSchema.parse(req.body);
    const result = await jobQueue.enqueue(`analyze:${parsed.queryType}`, () =>
      agent.analyze(parsed)
    );
    return res.json(result);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Invalid request payload",
        issues: error.issues
      });
    }

    if (error.message && error.message.includes("Job queue full")) {
      return res.status(503).json({ message: "Service busy, try again later" });
    }

    // eslint-disable-next-line no-console
    console.error("[educreds_trust_agent] /analyze error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 2) Institution onboarding / Quack AI legitimacy analysis (whitepaper §4)
router.post("/institution/onboarding", async (req: Request, res: Response) => {
  try {
    const parsed = InstitutionOnboardingRequestSchema.parse(req.body);
    const result = await jobQueue.enqueue("institution:onboarding", () =>
      agent.analyzeInstitutionOnboarding(parsed)
    );
    return res.json(result);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Invalid request payload",
        issues: error.issues
      });
    }

    if (error.message && error.message.includes("Job queue full")) {
      return res.status(503).json({ message: "Service busy, try again later" });
    }

    // eslint-disable-next-line no-console
    console.error("[educreds_trust_agent] /institution/onboarding error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 3) Behavioural PoIC supplementary AI risk analysis
router.post("/poic/behavior", async (req: Request, res: Response) => {
  try {
    const parsed = PoicBehaviorRequestSchema.parse(req.body);
    const result = await jobQueue.enqueue("poic:behavior", () =>
      agent.analyzePoicBehavior(parsed)
    );
    return res.json(result);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Invalid request payload",
        issues: error.issues
      });
    }

    if (error.message && error.message.includes("Job queue full")) {
      return res.status(503).json({ message: "Service busy, try again later" });
    }

    // eslint-disable-next-line no-console
    console.error("[educreds_trust_agent] /poic/behavior error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 4) Governance proposal analysis (risk surfacing for DAO)
router.post("/governance/proposal-analysis", async (req: Request, res: Response) => {
  try {
    const parsed = GovernanceProposalAnalysisRequestSchema.parse(req.body);
    const result = await jobQueue.enqueue("governance:proposal-analysis", () =>
      agent.analyzeGovernanceProposal(parsed)
    );
    return res.json(result);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Invalid request payload",
        issues: error.issues
      });
    }

    if (error.message && error.message.includes("Job queue full")) {
      return res.status(503).json({ message: "Service busy, try again later" });
    }

    // eslint-disable-next-line no-console
    console.error(
      "[educreds_trust_agent] /governance/proposal-analysis error",
      error
    );
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 5) Dispute / anomaly analysis
router.post("/disputes/analyze", async (req: Request, res: Response) => {
  try {
    const parsed = DisputeAnalysisRequestSchema.parse(req.body);
    const result = await jobQueue.enqueue("disputes:analyze", () =>
      agent.analyzeDispute(parsed)
    );
    return res.json(result);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Invalid request payload",
        issues: error.issues
      });
    }

    if (error.message && error.message.includes("Job queue full")) {
      return res.status(503).json({ message: "Service busy, try again later" });
    }

    // eslint-disable-next-line no-console
    console.error("[educreds_trust_agent] /disputes/analyze error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 6) Chat Interface (RAG)
router.post("/chat", async (req: Request, res: Response) => {
  try {
    console.log("[agentRoutes] /chat request received");
    const parsed = ChatRequestSchema.parse(req.body);

    // Enqueue chat inference work through the queue worker model
    const chatPromise = jobQueue.enqueue("chat", () => agent.chat(parsed));
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Chat request timeout after 60 seconds')), 60000)
    );

    const result = await Promise.race([chatPromise, timeoutPromise]);
    console.log("[agentRoutes] /chat request completed successfully");
    return res.json(result);
  } catch (error: any) {
    console.error("[educreds_trust_agent] /chat error", error);

    if (error.message && error.message.includes("Job queue full")) {
      return res.status(503).json({ message: "Service busy, try again later" });
    }

    // Handle different error types
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Invalid request payload",
        issues: error.issues
      });
    }

    if (error.message && error.message.includes('timeout')) {
      return res.status(504).json({
        message: "Request timeout - please try again",
        error: "Backend service request exceeded timeout limit"
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      error: error.message || "Unknown error occurred"
    });
  }
});

// Job status lookup for queued inference tasks
router.get("/jobs/:jobId", (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const status = jobQueue.getJobStatus(jobId);
  if (!status) {
    return res.status(404).json({ message: "Job not found" });
  }

  return res.json(status);
});

// Simple health check for ops / monitoring
router.get("/health", (_req: Request, res: Response) => {
  return res.json({ status: "ok", service: "educreds_trust_agent" });
});

export { router as agentRoutes };
