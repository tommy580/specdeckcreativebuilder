export interface Dimension {
  width: number;
  height: number;
  label?: string;
  supportsRetina: boolean;
}

export interface FileSizeLimit {
  maxKB: number;
  recommendedKB?: number;
}

export interface VideoSpecs {
  minDurationSeconds?: number;
  maxDurationSeconds: number;
  recommendedDurationSeconds?: number[];
  frameRates?: number[];
  supportedFormats: string[];
}

export interface TextSpecs {
  primaryText?: number;
  headline?: number;
  description?: number;
  brand?: number;
}

export interface CreativeSpec {
  id: string;
  creativeType: string;
  category: string;
  platform?: string;
  placement?: string;
  dimensions: Dimension[];
  supportedFormats: string[];
  fileSizeLimit: FileSizeLimit;
  videoSpecs?: VideoSpecs | null;
  textSpecs?: TextSpecs | null;
  notes?: string;
}

export interface MediaPlanMetadata {
  client: string;
  campaign: string;
  timePeriod: string;
  agency: string;
  agencyContact: string;
  contactEmail: string;
  product?: string;
}

export interface MediaPlanLineItem {
  id: string;
  channel: string;
  mediaPartner: string;
  runDates: string;
  adUnits: string[];
  totalImpressions: number;
  totalMediaSpend: number;
  notes: string;
  detectedCreativeType?: string;
  detectedCategory?: string;
}

export interface ParsedMediaPlan {
  metadata: MediaPlanMetadata;
  lineItems: MediaPlanLineItem[];
  warnings: string[];
}

export interface SpecRequirement {
  lineItemId: string;
  dimension: string;
  matchedSpec: CreativeSpec | null;
  matchConfidence: "exact" | "fuzzy" | "none";
  requiredFormats: string[];
  maxFileSizeKB: number;
  maxFileSizeDisplay: string;
  videoDuration?: string;
  warnings: string[];
}

export interface QACheck {
  checkName: "File Type" | "Dimensions" | "File Size";
  expected: string;
  actual: string;
  status: "pass" | "fail" | "warning";
  message?: string;
}

export interface AssetQAResult {
  filename: string;
  targetSpec: string;
  thumbnailUrl?: string;
  checks: QACheck[];
  overallStatus: "pass" | "fail";
}
