/**
 * PoIC Endpoint Service
 * Handles formula-based PoIC computation for institutional credibility scoring
 * Implements full specification compliance per PoIC.md
 */

import { PoICComputationHelper } from "./PoICComputationHelper";
import { PoICVersionManager } from "./PoICVersionManager";

export interface PoICComputeInput {
  institutionId: string;
  institutionName: string;
  dimension1: {
    governmentRegistrationConfidence: number; // G: 0-1
    accreditationCredibility: number; // A: 0-1
    accreditationStability: number; // S: 0-1
    legalRiskProbability: number; // L: 0-1
  };
  dimension2: {
    digitalFootprintLongevity: number; // 0-1
    facultyVerifiability: number; // 0-1
    publicRegistryConsistency: number; // 0-1
    studentBodyEvidence: number; // 0-1
    infrastructureSignals: number; // 0-1
  };
  dimension3: {
    issuanceStabilityIndex: number; // S: 0-1
    entropyScore: number; // E: 0-1
    anomalyScore: number; // A: 0-1
    revocationRatio: number; // R: 0-1
  };
  dimension4: {
    verificationRate: number; // V: 0-1
    verificationDiversity: number; // D: 0-1
    reverificationRate: number; // Re-verification: 0-1
    failedVerifications: number; // Fail: 0-1
  };
  dimension5: {
    baseScore: number; // 0-100
    disputeCount: number; // >=0
    severityLevel: "none" | "low" | "medium" | "high" | "critical";
    slashingRatioPct: number; // 0-100
  };
  decayCoefficient?: number; // λ, default 0.01
  evaluationTimestamp?: string; // ISO 8601
}

export interface PoICComputeOutput {
  institutionId: string;
  institutionName: string;
  masterScore: number; // 0-100
  dimensions: {
    d1_legalAccreditation: number;
    d2_operationalAuthenticity: number;
    d3_issuanceBehavior: number;
    d4_verificationFeedback: number;
    d5_governanceDispute: number;
  };
  issuanceCapacity: {
    tier: "RESTRICTED" | "LIMITED" | "MODERATE" | "EXTENDED" | "FULL";
    maxIssuances: number;
    description: string;
  };
  governanceAction: {
    recommendation: "APPROVE" | "MONITORING" | "RESTRICTED" | "INVESTIGATE";
    rationale: string;
  };
  modelVersion: string;
  modelHash: string;
  evaluatedAt: string;
  auditTrail: {
    component: string;
    value: number;
    timestamp: string;
  }[];
}

export class PoICEndpointService {
  private versionManager: PoICVersionManager;

  constructor(versionManager: PoICVersionManager) {
    this.versionManager = versionManager;
  }

  async computePoIC(input: PoICComputeInput): Promise<PoICComputeOutput> {
    console.log("[PoICEndpointService] Computing PoIC for institution:", input.institutionId);

    const auditTrail: Array<{ component: string; value: number; timestamp: string }> = [];
    const timestamp = new Date().toISOString();

    try {
      // Calculate D1: Legal & Accreditation
      const d1 = PoICComputationHelper.calculateD1LegalAccreditation(
        input.dimension1.governmentRegistrationConfidence,
        input.dimension1.accreditationCredibility,
        input.dimension1.accreditationStability,
        input.dimension1.legalRiskProbability
      );
      auditTrail.push({ component: "D1_Legal_Accreditation", value: d1, timestamp });
      console.log("[PoICEndpointService] D1 Score:", d1);

      // Calculate D2: Operational Authenticity (5 individual parameters, not array)
      const d2 = PoICComputationHelper.calculateD2OperationalAuthenticity(
        input.dimension2.digitalFootprintLongevity,
        input.dimension2.facultyVerifiability,
        input.dimension2.publicRegistryConsistency,
        input.dimension2.studentBodyEvidence,
        input.dimension2.infrastructureSignals
      );
      auditTrail.push({ component: "D2_Operational_Authenticity", value: d2, timestamp });
      console.log("[PoICEndpointService] D2 Score:", d2);

      // Calculate D3: Issuance Behavior Quality
      const d3 = PoICComputationHelper.calculateD3IssuanceBehaviorQuality(
        input.dimension3.issuanceStabilityIndex,
        input.dimension3.entropyScore,
        input.dimension3.anomalyScore,
        input.dimension3.revocationRatio
      );
      auditTrail.push({ component: "D3_Issuance_Behavior", value: d3, timestamp });
      console.log("[PoICEndpointService] D3 Score:", d3);

      // Calculate D4: Verification & Feedback
      const d4 = PoICComputationHelper.calculateD4VerificationFeedback(
        input.dimension4.verificationRate,
        input.dimension4.verificationDiversity,
        input.dimension4.reverificationRate,
        input.dimension4.failedVerifications
      );
      auditTrail.push({ component: "D4_Verification_Feedback", value: d4, timestamp });
      console.log("[PoICEndpointService] D4 Score:", d4);

      // Calculate D5: Governance & Disputes
      // Transform input format to helper format:
      // Input has: baseScore, disputeCount, severityLevel, slashingRatioPct
      // Helper takes: baseScore, penaltyWeight, slashingRatio
      let penaltyWeight = 0;
      let slashingRatio = 0;

      if (input.dimension5.disputeCount > 0) {
        // Calculate penalty weight based on severity level
        const severityWeights: Record<string, number> = {
          "none": 0,
          "low": 0.1,
          "medium": 0.3,
          "high": 0.6,
          "critical": 1.0
        };
        penaltyWeight = severityWeights[input.dimension5.severityLevel] || 0;
        slashingRatio = input.dimension5.slashingRatioPct / 100; // Convert percentage to decimal
      }

      const d5 = PoICComputationHelper.calculateD5GovernanceDispute(
        input.dimension5.baseScore,
        penaltyWeight,
        slashingRatio
      );
      auditTrail.push({ component: "D5_Governance_Dispute", value: d5, timestamp });
      console.log("[PoICEndpointService] D5 Score:", d5);

      // Calculate Master PoIC Score
      const masterScore = PoICComputationHelper.calculateMasterPoICScore(d1, d2, d3, d4, d5);
      auditTrail.push({ component: "Master_PoIC_Score", value: masterScore, timestamp });
      console.log("[PoICEndpointService] Master PoIC Score:", masterScore);

      // Get governance action recommendation
      const govAction = PoICComputationHelper.getGovernanceActionRecommendation(masterScore);

      // Get issuance capacity
      const capacity = PoICComputationHelper.getIssuanceCapByPoICScore(masterScore);

      // Get version info
      const versionInfo = this.versionManager.getVersionMetadata();

      // Build audit trail - add slashing penalty details if applicable
      if (input.dimension5.disputeCount > 0 && input.dimension5.severityLevel !== "none") {
        const slashingDetails = PoICComputationHelper.calculateSlashingPenalty(
          input.dimension5.severityLevel as "low" | "medium" | "high" | "critical",
          `${input.dimension5.disputeCount} dispute(s)`
        );
        auditTrail.push({
          component: "Slashing_Penalty",
          value: slashingDetails.penaltyWeight,
          timestamp
        });
      }

      // Apply time decay if provided historical data
      let finalScore = masterScore;
      if (input.evaluationTimestamp && input.decayCoefficient) {
        const eventAge = (new Date().getTime() - new Date(input.evaluationTimestamp).getTime()) / (1000 * 60 * 60 * 24); // days
        finalScore = PoICComputationHelper.applyTimeDecay(
          masterScore,
          eventAge,
          input.decayCoefficient
        );
        auditTrail.push({
          component: "Time_Decay_Applied",
          value: finalScore,
          timestamp
        });
        console.log("[PoICEndpointService] Time decay applied, adjusted score:", finalScore);
      }

      // Map capacity object to output format
      // issuanceCapByPoICScore returns: { score, cap, category, description }
      // cap values are: "Unlimited", "10,000/month", "2,000/month", "500/month", "Restricted/Suspended"
      // We need to map to: { tier, maxIssuances, description }
      const capToTierMap: Record<string, { tier: "RESTRICTED" | "LIMITED" | "MODERATE" | "EXTENDED" | "FULL"; maxIssuances: number }> = {
        "Unlimited": { tier: "FULL", maxIssuances: 50000 },
        "10,000/month": { tier: "EXTENDED", maxIssuances: 10000 },
        "2,000/month": { tier: "MODERATE", maxIssuances: 2000 },
        "500/month": { tier: "LIMITED", maxIssuances: 500 },
        "Restricted/Suspended": { tier: "RESTRICTED", maxIssuances: 0 }
      };

      const tierInfo = capToTierMap[capacity.cap] || { tier: "RESTRICTED" as const, maxIssuances: 0 };

      // Map governance action object to output format
      // getGovernanceActionRecommendation returns: { action, reasoning, restrictions, suggested_monitoring }
      // We need: { recommendation, rationale }
      const actionMap = {
        "approve": "APPROVE" as const,
        "approve_with_monitoring": "MONITORING" as const,
        "restrict_issuance": "RESTRICTED" as const,
        "suspend": "INVESTIGATE" as const
      };

      const result: PoICComputeOutput = {
        institutionId: input.institutionId,
        institutionName: input.institutionName,
        masterScore: finalScore,
        dimensions: {
          d1_legalAccreditation: d1,
          d2_operationalAuthenticity: d2,
          d3_issuanceBehavior: d3,
          d4_verificationFeedback: d4,
          d5_governanceDispute: d5
        },
        issuanceCapacity: {
          tier: tierInfo.tier,
          maxIssuances: tierInfo.maxIssuances,
          description: capacity.description
        },
        governanceAction: {
          recommendation: (actionMap[govAction.action as keyof typeof actionMap] || "INVESTIGATE") as "APPROVE" | "MONITORING" | "RESTRICTED" | "INVESTIGATE",
          rationale: govAction.reasoning
        },
        modelVersion: versionInfo.version,
        modelHash: versionInfo.versionHash,
        evaluatedAt: timestamp,
        auditTrail
      };

      console.log("[PoICEndpointService] PoIC computation completed successfully");
      return result;
    } catch (error: any) {
      console.error("[PoICEndpointService] PoIC computation failed:", error);
      throw new Error(`PoIC computation failed: ${error.message}`);
    }
  }
}
