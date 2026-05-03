import test from "node:test";
import assert from "node:assert/strict";
import { PoICEndpointService } from "../services/PoICEndpointService";
import { PoICVersionManager } from "../services/PoICVersionManager";

const payload = {
  institutionId: "inst-001",
  institutionName: "Test University",
  dimension1: {
    governmentRegistrationConfidence: 0.95,
    accreditationCredibility: 0.9,
    accreditationStability: 0.85,
    legalRiskProbability: 0.05
  },
  dimension2: {
    digitalFootprintLongevity: 0.88,
    facultyVerifiability: 0.92,
    publicRegistryConsistency: 0.87,
    studentBodyEvidence: 0.89,
    infrastructureSignals: 0.84
  },
  dimension3: {
    issuanceStabilityIndex: 0.91,
    entropyScore: 0.78,
    anomalyScore: 0.05,
    revocationRatio: 0.02
  },
  dimension4: {
    verificationRate: 0.96,
    verificationDiversity: 0.89,
    reverificationRate: 0.7,
    failedVerifications: 0.01
  },
  dimension5: {
    baseScore: 85,
    disputeCount: 0,
    severityLevel: "none" as const,
    slashingRatioPct: 0
  }
};

function createService() {
  const manager = new PoICVersionManager();
  manager.registerVersion("# PoIC v1.0.0", "v1.0.0", "local");
  return { manager, service: new PoICEndpointService(manager) };
}

test("PoIC endpoint service returns deterministic score for same payload", async () => {
  const { service } = createService();
  const res1 = await service.computePoIC(payload);
  const res2 = await service.computePoIC(payload);

  assert.equal(res1.masterScore, res2.masterScore);
  assert.deepEqual(
    res1.auditTrail.map((entry) => entry.component),
    res2.auditTrail.map((entry) => entry.component)
  );
});

test("PoIC endpoint service includes full audit trail with all dimensions and master score", async () => {
  const { service } = createService();
  const result = await service.computePoIC(payload);
  const components = result.auditTrail.map((entry) => entry.component);

  assert.ok(components.includes("D1_Legal_Accreditation"));
  assert.ok(components.includes("D2_Operational_Authenticity"));
  assert.ok(components.includes("D3_Issuance_Behavior"));
  assert.ok(components.includes("D4_Verification_Feedback"));
  assert.ok(components.includes("D5_Governance_Dispute"));
  assert.ok(components.includes("Master_PoIC_Score"));
});

test("Version manager returns PoIC model metadata expected by /poic/version", () => {
  const { manager } = createService();
  const versionInfo = manager.getVersionMetadata();

  assert.equal(typeof versionInfo.version, "string");
  assert.equal(typeof versionInfo.versionHash, "string");
  assert.equal(typeof versionInfo.loadedAt, "string");
  assert.equal(versionInfo.version, "v1.0.0");
  assert.ok(versionInfo.versionHash.length > 0);
});
