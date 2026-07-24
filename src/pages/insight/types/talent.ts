export interface TalentBaseline {
  maxCodeQuality: number;
  codeQuality: number;
  prTitleAndDescriptionQuality: number;
  maxPrTitleAndDescriptionQuality: number;
  valueLevel: number;
  maxValueLevel: number;
  issueQuality: number;
  maxIssueQuality: number;
  openrank: number;
  maxOpenrank: number;
  /**
   * Year-indexed descending thresholds that partition OpenRank into 7 tiers:
   * SSS / SS / S / A / B / C / D.
   * Each year maps to its own 6-element threshold array where:
   * value > tiers[0]                 -> SSS
   * tiers[0] >= value > tiers[1]     -> SS
   * tiers[1] >= value > tiers[2]     -> S
   * tiers[2] >= value > tiers[3]     -> A
   * tiers[3] >= value > tiers[4]     -> B
   * tiers[4] >= value > tiers[5]     -> C
   * value <= tiers[5]                -> D
   * Years outside the covered range fall back to the closest boundary year.
   */
  openrankTiers?: Record<string, number[]>;
}

export interface PrTypeItem {
  type: string; // Feature | Fix | Refactor | Chore | Docs | Other
  count: number;
}

export interface OpenRankRepoContribution {
  repoId: number;
  repoName: string;
  openrank: number;
}

export interface TechAreaContribution {
  name: string;
  o: number;
}

export interface TalentYearData {
  openIssues: number;
  participantIssues: number;
  openPrs: number;
  mergedPrs: number;
  prReviews: number;
  codeChanges: number;
  avgCodeQuality: number;
  avgPrTitleAndDescriptionQuality: number;
  avgValueLevel: number;
  prTypes: PrTypeItem[];
  avgIssueQuality: number;
  totalOpenrankContributions: number;
  openRankContributionTop10: OpenRankRepoContribution[];
  openRankContributionByTechArea: TechAreaContribution[];
}

export type TalentData = Record<string, TalentYearData>;
