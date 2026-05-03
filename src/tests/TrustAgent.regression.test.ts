import test from "node:test";
import assert from "node:assert/strict";
import { EducredsTrustAgent } from "../agent/trustAgent";
import type { TrustLLMClient } from "../services/llmClient";
import { PoICComputationHelper } from "../services/PoICComputationHelper";

class MockLLMClient implements TrustLLMClient {
  private responses: string[];

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async complete(_input: { system: string; user: string }): Promise<string> {
    return this.responses.shift() ?? "{}";
  }

  getModel(): string {
    return "mock-model";
  }

  getProvider(): string {
    return "mock";
  }
}

test("Regression: institution onboarding returns hybrid output when D1/D2 are provided", async () => {
  const llm = new MockLLMClient([
    JSON.stringify({
      proposalId: "prop-1",
      legitimacyScore: 10,
      aiRiskScore: 35,
      riskFlags: ["incomplete docs"],
      recommendedAction: "approve_with_limits",
      suggestedIssuanceLimit: 200,
      notes: "model output",
      createdAt: "2026-02-14T00:00:00.000Z"
    })
  ]);
  const agent = new EducredsTrustAgent(llm);

  const input = {
    institutionId: "inst-1",
    institutionName: "Hybrid Academy",
    jurisdiction: "NG",
    dimension1: {
      governmentRegistrationConfidence: 0.9,
      accreditationCredibility: 0.8,
      accreditationStability: 0.85,
      legalRiskProbability: 0.05
    },
    dimension2: {
      digitalFootprintLongevity: 0.8,
      facultyVerifiability: 0.75,
      publicRegistryConsistency: 0.7,
      studentBodyEvidence: 0.8,
      infrastructureSignals: 0.9
    }
  };

  const result = await agent.analyzeInstitutionOnboarding(input);
  const expectedD1 = PoICComputationHelper.calculateD1LegalAccreditation(0.9, 0.8, 0.85, 0.05);
  const expectedD2 = PoICComputationHelper.calculateD2OperationalAuthenticity(0.8, 0.75, 0.7, 0.8, 0.9);
  const expectedProto = PoICComputationHelper.calculateMasterPoICScore(expectedD1, expectedD2, 50, 50, 100);

  assert.equal(result.metadata.computationMethod, "hybrid");
  assert.ok(result.formulaContext);
  assert.equal(result.formulaContext?.d1, expectedD1);
  assert.equal(result.formulaContext?.d2, expectedD2);
  assert.equal(result.legitimacyScore, expectedProto);
});

test("Regression: onboarding falls back to llm_based when D1/D2 extraction fails", async () => {
  const llm = new MockLLMClient([
    "not valid json for extraction",
    JSON.stringify({
      proposalId: "prop-2",
      legitimacyScore: 67,
      aiRiskScore: 30,
      riskFlags: [],
      recommendedAction: "approve",
      suggestedIssuanceLimit: 670,
      notes: "fallback worked",
      createdAt: "2026-02-14T00:00:00.000Z"
    })
  ]);
  const agent = new EducredsTrustAgent(llm);

  const result = await agent.analyzeInstitutionOnboarding({
    institutionName: "Fallback College",
    legalDocsSummary: "Basic legal docs available",
    accreditationSummary: "Accredited nationally",
    operationalHistorySummary: "Operating for 10 years"
  });

  assert.equal(result.metadata.computationMethod, "llm_based");
  assert.equal(result.formulaContext, undefined);
  assert.equal(result.legitimacyScore, 67);
});

test("Regression: behavior analysis accepts time-decay inputs and still returns advisory output", async () => {
  const llm = new MockLLMClient([
    JSON.stringify({
      aiRiskScore: 44,
      summary: "Stable but requires monitoring",
      drivers: ["revocation trend", "feedback quality"],
      recommendations: ["increase audits"]
    })
  ]);
  const agent = new EducredsTrustAgent(llm);

  const result = await agent.analyzePoicBehavior({
    institutionId: "inst-3",
    issuanceMetrics: {
      totalIssued: 1200,
      totalRevoked: 20,
      totalFrozen: 4,
      issuanceHistory: [
        { timestamp: "2026-02-10T00:00:00.000Z", eventScore: 90 },
        { timestamp: "2026-01-10T00:00:00.000Z", eventScore: 70 }
      ]
    },
    timeWindow: "last_30_days",
    evaluationTimestamp: "2026-02-14T00:00:00.000Z",
    decayCoefficient: 0.01
  });

  assert.equal(result.metadata.computationMethod, "llm_based");
  assert.equal(result.aiRiskScore, 44);
  assert.ok(Array.isArray(result.drivers));
  assert.ok(Array.isArray(result.recommendations));
});
