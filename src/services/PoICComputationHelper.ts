/**
 * PoICComputationHelper - Structured calculation of PoIC dimension scores
 *
 * Implements all formulas from PoIC Whitepaper §3-§7 in auditable, reusable functions.
 * Output is deterministic and traceable for governance compliance.
 */

export interface IssuanceCapRecommendation {
  score: number;
  cap: string;
  category: string;
  description: string;
}

export interface GovernanceActionRecommendation {
  action: 'approve' | 'approve_with_monitoring' | 'restrict_issuance' | 'suspend';
  reasoning: string;
  restrictions: string[];
  suggested_monitoring: string[];
}

/**
 * D₁ — Legal & Accreditation Integrity (25% of PoIC)
 *
 * Formula: D₁ = 0.30G + 0.40A + 0.15S + 0.15(1 - L)
 *
 * Where:
 * - G = government registration confidence (0–1)
 * - A = accreditation credibility score (0–1)
 * - S = accreditation stability score (0–1)
 * - L = legal risk probability (0–1)
 *
 * @returns Normalized score 0-100
 */
export function calculateD1LegalAccreditation(
  govRegConfidence: number,
  accreditationCredibility: number,
  accreditationStability: number,
  legalRiskProbability: number
): number {
  const govRegConfidenceNorm = clamp(govRegConfidence, 0, 1);
  const accredConfidenceNorm = clamp(accreditationCredibility, 0, 1);
  const accredStabilityNorm = clamp(accreditationStability, 0, 1);
  const legalRiskNorm = clamp(legalRiskProbability, 0, 1);

  const d1 =
    0.3 * govRegConfidenceNorm +
    0.4 * accredConfidenceNorm +
    0.15 * accredStabilityNorm +
    0.15 * (1 - legalRiskNorm);

  return Math.round(d1 * 100);
}

/**
 * D₂ — Operational Authenticity (20% of PoIC)
 *
 * Formula: WeightedAverage of operational features (all normalized 0-1)
 *
 * Features:
 * - Digital footprint longevity
 * - Faculty verifiability
 * - Public registry consistency
 * - Student body evidence
 * - Infrastructure signals
 *
 * @returns Normalized score 0-100
 */
export function calculateD2OperationalAuthenticity(
  digitalFootprint: number,
  facultyVerifiability: number,
  registryConsistency: number,
  studentBodyEvidence: number,
  infrastructureSignals: number
): number {
  const features = [
    clamp(digitalFootprint, 0, 1),
    clamp(facultyVerifiability, 0, 1),
    clamp(registryConsistency, 0, 1),
    clamp(studentBodyEvidence, 0, 1),
    clamp(infrastructureSignals, 0, 1)
  ];

  const d2 = features.reduce((a, b) => a + b, 0) / features.length;
  return Math.round(d2 * 100);
}

/**
 * D₃ — Issuance Behavior Quality (25% of PoIC)
 *
 * Formula: D₃ = 0.35S + 0.25E + 0.25(1 - A) + 0.15(1 - R)
 *
 * Where:
 * - S = issuance stability index (0–1)
 * - E = entropy score (0–1, measures credential diversity)
 * - A = anomaly score (0–1, output of sigmoid)
 * - R = revocation ratio (0–1, 0 is best)
 *
 * @returns Normalized score 0-100
 */
export function calculateD3IssuanceBehaviorQuality(
  issuanceStability: number,
  entropyScore: number,
  anomalyScore: number,
  revocationRatio: number
): number {
  const stabilityNorm = clamp(issuanceStability, 0, 1);
  const entropyNorm = clamp(entropyScore, 0, 1);
  const anomalyNorm = clamp(anomalyScore, 0, 1);
  const revocationNorm = clamp(revocationRatio, 0, 1);

  const d3 =
    0.35 * stabilityNorm +
    0.25 * entropyNorm +
    0.25 * (1 - anomalyNorm) +
    0.15 * (1 - revocationNorm);

  return Math.round(d3 * 100);
}

/**
 * D₄ — Verification & Market Feedback (15% of PoIC)
 *
 * Formula: D₄ = 0.4V + 0.3D + 0.2F - 0.1Fail
 *
 * Where:
 * - V = verification success rate (0–1)
 * - D = employer diversity score (0–1)
 * - F = re-verification frequency (0–1)
 * - Fail = failed verification ratio (0–1)
 *
 * @returns Normalized score 0-100
 */
export function calculateD4VerificationFeedback(
  verificationSuccessRate: number,
  employerDiversityIndex: number,
  reVerificationFrequency: number,
  failedVerificationRatio: number
): number {
  const verificationNorm = clamp(verificationSuccessRate, 0, 1);
  const diversityNorm = clamp(employerDiversityIndex, 0, 1);
  const reVerifNorm = clamp(reVerificationFrequency, 0, 1);
  const failureNorm = clamp(failedVerificationRatio, 0, 1);

  const d4 =
    0.4 * verificationNorm +
    0.3 * diversityNorm +
    0.2 * reVerifNorm -
    0.1 * failureNorm;

  return Math.round(clamp(d4, 0, 1) * 100);
}

/**
 * D₅ — Governance & Dispute History (15% of PoIC)
 *
 * Formula: D₅ = BaseScore - Penalty
 *
 * Penalty = severity_weight × slashing_ratio
 *
 * @returns Normalized score 0-100
 */
export function calculateD5GovernanceDispute(
  baseScore: number,
  penaltyWeight: number = 0,
  slashingRatio: number = 0
): number {
  // Accept both normalized (0-1) and percentage-style (0-100) base scores.
  const baseNorm = baseScore > 1 ? clamp(baseScore, 0, 100) / 100 : clamp(baseScore, 0, 1);
  const penaltyNorm = clamp(penaltyWeight * slashingRatio, 0, 1);

  const d5 = baseNorm - penaltyNorm;
  return Math.round(clamp(d5, 0, 1) * 100);
}

/**
 * Master PoIC Score Formula
 *
 * PoIC = 0.25D₁ + 0.20D₂ + 0.25D₃ + 0.15D₄ + 0.15D₅
 *
 * All dimensions are pre-calculated as 0-100 scores
 *
 * @returns Final PoIC score 0-100
 */
export function calculateMasterPoICScore(
  d1: number,
  d2: number,
  d3: number,
  d4: number,
  d5: number,
  weights?: {
    w1?: number;
    w2?: number;
    w3?: number;
    w4?: number;
    w5?: number;
  }
): number {
  const w1 = weights?.w1 ?? 0.25;
  const w2 = weights?.w2 ?? 0.2;
  const w3 = weights?.w3 ?? 0.25;
  const w4 = weights?.w4 ?? 0.15;
  const w5 = weights?.w5 ?? 0.15;

  const d1Norm = clamp(d1, 0, 100) / 100;
  const d2Norm = clamp(d2, 0, 100) / 100;
  const d3Norm = clamp(d3, 0, 100) / 100;
  const d4Norm = clamp(d4, 0, 100) / 100;
  const d5Norm = clamp(d5, 0, 100) / 100;

  const poic = w1 * d1Norm + w2 * d2Norm + w3 * d3Norm + w4 * d4Norm + w5 * d5Norm;

  return Math.round(clamp(poic, 0, 1) * 100);
}

/**
 * Time Decay Mechanism (Recency Weighting)
 *
 * Per PoIC §5: "Recent behavior impacts score more heavily than older data"
 *
 * Formula: weight = e^(-λt)
 *
 * Where:
 * - t = time since event (in days)
 * - λ = decay coefficient (default 0.01, higher = faster decay)
 *
 * @param eventScore - Original score (0-100)
 * @param daysSinceEvent - Days elapsed since event
 * @param decayCoefficient - λ in formula (default 0.01)
 * @returns Decayed score with recency weighting applied
 */
export function applyTimeDecay(
  eventScore: number,
  daysSinceEvent: number,
  decayCoefficient: number = 0.01
): number {
  const weight = Math.exp(-decayCoefficient * daysSinceEvent);
  return Math.round(eventScore * weight);
}

/**
 * Sigmoid Function for Anomaly Scoring
 *
 * Used to convert z-score (standardized issuance volume deviation) to 0-1 probability
 *
 * σ(x) = 1 / (1 + e^(-x))
 *
 * @param z - Z-score: (current_volume - mean) / std_dev
 * @returns Probability 0-1 (higher = more anomalous)
 */
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Calculate Anomaly Score for Issuance Volume
 *
 * Per PoIC §4 (D₃ component):
 * Detects issuance spikes using statistical anomaly detection
 *
 * @param currentVolume - Current issuance volume
 * @param historicalMean - Average historical volume
 * @param historicalStdDev - Standard deviation of historical volumes
 * @returns Anomaly score 0-100 (higher = more anomalous)
 */
export function calculateAnomalyScore(
  currentVolume: number,
  historicalMean: number,
  historicalStdDev: number
): number {
  if (historicalStdDev === 0) {
    // No variation in history, any change is suspicious
    return currentVolume !== historicalMean ? 50 : 0;
  }

  const zScore = (currentVolume - historicalMean) / historicalStdDev;
  const anomalyProb = sigmoid(Math.abs(zScore) - 2); // 2-sigma threshold
  return Math.round(anomalyProb * 100);
}

/**
 * Issuance Capacity Mapping (PoIC §7)
 *
 * DAO-configurable mapping of PoIC score ranges to issuance caps
 * Default mapping per whitepaper:
 * - 90-100 → Unlimited
 * - 80-89 → 10,000/month
 * - 70-79 → 2,000/month
 * - 60-69 → 500/month
 * - <60 → Restricted/Suspended
 *
 * @param poicScore - Final PoIC score 0-100
 * @returns Issuance cap recommendation with details
 */
export function getIssuanceCapByPoICScore(poicScore: number): IssuanceCapRecommendation {
  const score = clamp(poicScore, 0, 100);

  if (score >= 90) {
    return {
      score,
      cap: 'Unlimited',
      category: 'Excellent',
      description: 'Institution demonstrates exemplary credibility. No monthly issuance restrictions.'
    };
  } else if (score >= 80) {
    return {
      score,
      cap: '10,000/month',
      category: 'Good',
      description: 'Institution shows strong credibility. Standard monthly issuance cap applied.'
    };
  } else if (score >= 70) {
    return {
      score,
      cap: '2,000/month',
      category: 'Moderate',
      description: 'Institution credibility is acceptable. Reduced monthly issuance cap for monitoring.'
    };
  } else if (score >= 60) {
    return {
      score,
      cap: '500/month',
      category: 'Poor',
      description: 'Institution credibility is at risk. Significant issuance restrictions in place.'
    };
  } else {
    return {
      score,
      cap: 'Restricted/Suspended',
      category: 'Critical',
      description: 'Institution credibility is critically low. Issuance is restricted or suspended pending review.'
    };
  }
}

/**
 * Get Risk Category by PoIC Score
 *
 * Semantic categorization for governance communications
 *
 * @param poicScore - Final PoIC score 0-100
 * @returns Risk category label
 */
export function getRiskCategoryByScore(poicScore: number): 'excellent' | 'good' | 'moderate' | 'poor' | 'critical' {
  const score = clamp(poicScore, 0, 100);

  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'moderate';
  if (score >= 50) return 'poor';
  return 'critical';
}

/**
 * Governance Action Recommendation Based on PoIC Score
 *
 * Per PoIC §6: "DAO may approve, assign issuance cap, impose monitoring, initiate suspension, or trigger dispute review"
 *
 * @param poicScore - Final PoIC score 0-100
 * @returns Governance action recommendation with reasoning
 */
export function getGovernanceActionRecommendation(poicScore: number): GovernanceActionRecommendation {
  const score = clamp(poicScore, 0, 100);

  if (score >= 85) {
    return {
      action: 'approve',
      reasoning: 'Institution meets high credibility standards and poses minimal governance risk.',
      restrictions: [],
      suggested_monitoring: ['Annual credential audit']
    };
  } else if (score >= 70) {
    return {
      action: 'approve_with_monitoring',
      reasoning: 'Institution is acceptable but should be monitored for potential credibility drift.',
      restrictions: ['Monthly issuance reports required'],
      suggested_monitoring: [
        'Quarterly credential verification sampling',
        'Semi-annual institutional audit',
        'Continuous anomaly detection'
      ]
    };
  } else if (score >= 50) {
    return {
      action: 'restrict_issuance',
      reasoning: 'Institution credibility concerns warrant restricted issuance pending improvement.',
      restrictions: ['Monthly issuance cap', 'All credentials require manual verification before issuance', 'Bi-weekly reporting'],
      suggested_monitoring: [
        'Weekly credential sampling',
        'Monthly comprehensive audit',
        'Real-time anomaly alerts',
        'Mandatory remediation plan'
      ]
    };
  } else {
    return {
      action: 'suspend',
      reasoning: 'Institution credibility is critically compromised. Issuance suspension recommended with review required.',
      restrictions: ['All issuance suspended', 'Governance review required', 'Emergency dispute investigation'],
      suggested_monitoring: [
        'Immediate institutional audit',
        'Forensic credential review',
        'Legal/regulatory status verified',
        'DAO vote on reinstatement'
      ]
    };
  }
}

/**
 * Calculate Slashing Penalty Components
 *
 * Per PoIC §5 (D₅): Used when institution violates governance or has disputes
 *
 * @param severity - Violation severity level
 * @param violationType - Type of violation (optional, for logging)
 * @returns Penalty components for use in D₅ calculation
 */
export function calculateSlashingPenalty(
  severity: 'low' | 'medium' | 'high' | 'critical',
  violationType?: string
): { penaltyWeight: number; slashingRatio: number; description: string } {
  switch (severity) {
    case 'low':
      return {
        penaltyWeight: 0.05,
        slashingRatio: 0.1,
        description: `Minor governance breach${violationType ? ` (${violationType})` : ''}`
      };
    case 'medium':
      return {
        penaltyWeight: 0.15,
        slashingRatio: 0.3,
        description: `Moderate governance violation${violationType ? ` (${violationType})` : ''}`
      };
    case 'high':
      return {
        penaltyWeight: 0.3,
        slashingRatio: 0.6,
        description: `Serious governance breach${violationType ? ` (${violationType})` : ''}`
      };
    case 'critical':
      return {
        penaltyWeight: 0.5,
        slashingRatio: 0.9,
        description: `Critical governance violation${violationType ? ` (${violationType})` : ''}`
      };
  }
}

/**
 * Utility: Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Export all calculation functions as a single helper object
 */
export const PoICComputationHelper = {
  // Dimension calculators
  calculateD1LegalAccreditation,
  calculateD2OperationalAuthenticity,
  calculateD3IssuanceBehaviorQuality,
  calculateD4VerificationFeedback,
  calculateD5GovernanceDispute,

  // Master formula
  calculateMasterPoICScore,

  // Time-based calculations
  applyTimeDecay,
  calculateAnomalyScore,

  // Governance mappings
  getIssuanceCapByPoICScore,
  getRiskCategoryByScore,
  getGovernanceActionRecommendation,
  calculateSlashingPenalty
};
