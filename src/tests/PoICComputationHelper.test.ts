import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTimeDecay,
  calculateAnomalyScore,
  calculateD1LegalAccreditation,
  calculateD2OperationalAuthenticity,
  calculateD3IssuanceBehaviorQuality,
  calculateD4VerificationFeedback,
  calculateD5GovernanceDispute,
  calculateMasterPoICScore,
  getGovernanceActionRecommendation,
  getIssuanceCapByPoICScore
} from "../services/PoICComputationHelper";

test("D1 formula matches spec: 0.30G + 0.40A + 0.15S + 0.15(1-L)", () => {
  const d1 = calculateD1LegalAccreditation(0.9, 0.8, 0.85, 0.05);
  const expected = Math.round((0.3 * 0.9 + 0.4 * 0.8 + 0.15 * 0.85 + 0.15 * (1 - 0.05)) * 100);
  assert.equal(d1, expected);
});

test("D2 computes mean of 5 normalized features", () => {
  const d2 = calculateD2OperationalAuthenticity(1, 0.8, 0.6, 0.4, 0.2);
  const expected = Math.round(((1 + 0.8 + 0.6 + 0.4 + 0.2) / 5) * 100);
  assert.equal(d2, expected);
});

test("D3 formula applies weighted terms including inverse anomaly/revocation", () => {
  const d3 = calculateD3IssuanceBehaviorQuality(0.7, 0.8, 0.1, 0.2);
  const expected = Math.round((0.35 * 0.7 + 0.25 * 0.8 + 0.25 * (1 - 0.1) + 0.15 * (1 - 0.2)) * 100);
  assert.equal(d3, expected);
});

test("D4 formula clamps to [0,100]", () => {
  const d4 = calculateD4VerificationFeedback(1, 1, 1, 0);
  assert.equal(d4, 90);
  const d4Low = calculateD4VerificationFeedback(0, 0, 0, 1);
  assert.equal(d4Low, 0);
});

test("D5 applies slashing penalty to base score", () => {
  const d5 = calculateD5GovernanceDispute(80, 0.5, 0.5);
  assert.equal(d5, 55);
});

test("Master PoIC score applies exact fixed weights", () => {
  const score = calculateMasterPoICScore(80, 70, 90, 60, 100);
  const expected = Math.round((0.25 * 0.8 + 0.2 * 0.7 + 0.25 * 0.9 + 0.15 * 0.6 + 0.15 * 1.0) * 100);
  assert.equal(score, expected);
});

test("Master PoIC score remains deterministic for repeated input", () => {
  const a = calculateMasterPoICScore(77, 66, 55, 44, 33);
  const b = calculateMasterPoICScore(77, 66, 55, 44, 33);
  assert.equal(a, b);
});

test("Time decay applies exponential weighting e^(-lambda*t)", () => {
  const recent = applyTimeDecay(100, 1, 0.01);
  const old = applyTimeDecay(100, 365, 0.01);
  assert.ok(recent <= 100 && recent > 0);
  assert.ok(old < recent);
});

test("Anomaly score uses sigmoid-like mapping and stays in bounds", () => {
  const baseline = calculateAnomalyScore(100, 100, 20);
  const spike = calculateAnomalyScore(200, 100, 20);
  assert.ok(baseline >= 0 && baseline <= 100);
  assert.ok(spike >= 0 && spike <= 100);
  assert.ok(spike > baseline);
});

test("Anomaly score handles zero std deviation edge case", () => {
  const stable = calculateAnomalyScore(100, 100, 0);
  const changed = calculateAnomalyScore(120, 100, 0);
  assert.equal(stable, 0);
  assert.equal(changed, 50);
});

test("Issuance cap mapping returns all five tiers at boundaries", () => {
  assert.equal(getIssuanceCapByPoICScore(95).cap, "Unlimited");
  assert.equal(getIssuanceCapByPoICScore(85).cap, "10,000/month");
  assert.equal(getIssuanceCapByPoICScore(75).cap, "2,000/month");
  assert.equal(getIssuanceCapByPoICScore(65).cap, "500/month");
  assert.equal(getIssuanceCapByPoICScore(40).cap, "Restricted/Suspended");
});

test("Governance action recommendations follow score bands", () => {
  assert.equal(getGovernanceActionRecommendation(90).action, "approve");
  assert.equal(getGovernanceActionRecommendation(75).action, "approve_with_monitoring");
  assert.equal(getGovernanceActionRecommendation(55).action, "restrict_issuance");
  assert.equal(getGovernanceActionRecommendation(45).action, "suspend");
});
