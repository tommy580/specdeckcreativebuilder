import { CreativeSpec, MediaPlanLineItem, SpecRequirement } from "./types";
import { formatFileSize } from "./utils";

interface MatchRule {
  keywords: string[];
  excludeKeywords?: string[];
  category: string;
  creativeType?: string;
  matchByDimension?: boolean;
}

const MATCH_RULES: MatchRule[] = [
  {
    keywords: ["expandable"],
    excludeKeywords: [],
    category: "P/A Banners",
    creativeType: "P/A Banners - Rich Media Expandable",
  },
  {
    keywords: ["moments", "in-store moments"],
    excludeKeywords: ["rich media"],
    category: "Moments",
    creativeType: "Moments - Static",
  },
  {
    keywords: ["moments", "in-store moments"],
    excludeKeywords: [],
    category: "Moments",
    creativeType: "Moments - Rich Media",
  },
  {
    keywords: ["preceptivity", "p/a", "audience display banners"],
    excludeKeywords: ["rich media", "expandable"],
    category: "P/A Banners",
    creativeType: "P/A Banners - Static",
  },
  {
    keywords: ["preceptivity", "p/a", "audience display banners"],
    excludeKeywords: ["expandable"],
    category: "P/A Banners",
    creativeType: "P/A Banners - Rich Media",
  },
  {
    keywords: ["high-impact", "high impact"],
    category: "High-Impact",
    matchByDimension: true,
  },
  {
    keywords: ["online video", "olv"],
    category: "OLV",
    creativeType: "Online Video (OLV)",
  },
  {
    keywords: ["connected tv", "ctv"],
    category: "CTV",
    creativeType: "Connected TV (CTV)",
  },
  {
    keywords: ["meta", "facebook", "instagram"],
    category: "Social",
    matchByDimension: true,
  },
  {
    keywords: ["snap", "snapchat"],
    category: "Social",
    creativeType: "Social - Snap",
  },
  {
    keywords: ["pinterest"],
    category: "Social",
    creativeType: "Social - Pinterest",
  },
  {
    keywords: ["digital screens", "dooh", "digital out of home", "in-store digital"],
    category: "DOOH",
    creativeType: "Digital Out of Home (DOOH)",
  },
];

function matchCreativeType(
  mediaPartner: string,
  specs: CreativeSpec[]
): { spec: CreativeSpec | null; confidence: "exact" | "fuzzy" | "none" } {
  const text = mediaPartner.toLowerCase();

  for (const rule of MATCH_RULES) {
    const hasKeyword = rule.keywords.some((kw) => text.includes(kw.toLowerCase()));
    if (!hasKeyword) continue;

    // Check for "rich media" qualifier
    const hasRichMedia = text.includes("rich media");
    const hasExpandable = text.includes("expandable");

    // For rules with excludeKeywords, skip if any exclude keyword is present
    if (rule.excludeKeywords && rule.excludeKeywords.length > 0) {
      const hasExclude = rule.excludeKeywords.some((ek) => text.includes(ek.toLowerCase()));
      if (hasExclude) continue;
    }

    // For Moments rules: check rich media qualifier
    if (rule.category === "Moments") {
      if (rule.creativeType === "Moments - Static" && hasRichMedia) continue;
      if (rule.creativeType === "Moments - Rich Media" && !hasRichMedia) continue;
    }

    // For P/A Banners: check rich media and expandable qualifiers
    if (rule.category === "P/A Banners") {
      if (rule.creativeType === "P/A Banners - Static" && hasRichMedia) continue;
      if (rule.creativeType === "P/A Banners - Rich Media" && !hasRichMedia) continue;
      if (rule.creativeType === "P/A Banners - Rich Media" && hasExpandable) continue;
      if (rule.creativeType === "P/A Banners - Rich Media Expandable" && !hasExpandable) continue;
    }

    if (rule.creativeType) {
      const matchedSpec = specs.find((s) => s.creativeType === rule.creativeType);
      if (matchedSpec) {
        return { spec: matchedSpec, confidence: "exact" };
      }
    }

    if (rule.matchByDimension) {
      // Return category match — dimension matching happens later
      const categorySpecs = specs.filter((s) => s.category === rule.category);
      if (categorySpecs.length > 0) {
        return { spec: categorySpecs[0], confidence: "fuzzy" };
      }
    }
  }

  return { spec: null, confidence: "none" };
}

function findSpecByDimension(
  dimension: string,
  category: string,
  specs: CreativeSpec[]
): CreativeSpec | null {
  const [wStr, hStr] = dimension.split("x");
  const w = parseInt(wStr, 10);
  const h = parseInt(hStr, 10);

  const categorySpecs = specs.filter((s) => s.category === category);

  for (const spec of categorySpecs) {
    for (const dim of spec.dimensions) {
      if (dim.width === w && dim.height === h) {
        return spec;
      }
    }
  }

  return null;
}

function getDimensionMatch(
  dimension: string,
  spec: CreativeSpec
): { matched: boolean; confidence: "exact" | "fuzzy" | "none" } {
  const [wStr, hStr] = dimension.split("x");
  const w = parseInt(wStr, 10);
  const h = parseInt(hStr, 10);

  for (const dim of spec.dimensions) {
    if (dim.width === w && dim.height === h) {
      return { matched: true, confidence: "exact" };
    }
  }

  return { matched: false, confidence: "none" };
}

export function generateSpecRequirements(
  lineItems: MediaPlanLineItem[],
  specs: CreativeSpec[]
): SpecRequirement[] {
  const requirements: SpecRequirement[] = [];

  for (const item of lineItems) {
    const { spec: matchedSpec, confidence: typeConfidence } = matchCreativeType(
      item.mediaPartner,
      specs
    );

    // Update the line item with detected type info
    if (matchedSpec) {
      item.detectedCreativeType = matchedSpec.creativeType;
      item.detectedCategory = matchedSpec.category;
    }

    for (const dimension of item.adUnits) {
      const warnings: string[] = [];
      let finalSpec = matchedSpec;
      let finalConfidence = typeConfidence;

      // For categories that match by dimension, find the specific spec
      if (
        matchedSpec &&
        (matchedSpec.category === "High-Impact" || matchedSpec.category === "Social")
      ) {
        const dimSpec = findSpecByDimension(dimension, matchedSpec.category, specs);
        if (dimSpec) {
          finalSpec = dimSpec;
          finalConfidence = "exact";
        } else {
          finalConfidence = "fuzzy";
          warnings.push(
            `Dimension ${dimension} not in standard ${matchedSpec.category} specs`
          );
        }
      } else if (finalSpec) {
        const dimMatch = getDimensionMatch(dimension, finalSpec);
        if (!dimMatch.matched) {
          finalConfidence = "fuzzy";
          warnings.push(
            `Dimension ${dimension} not in standard ${finalSpec.creativeType} specs`
          );
        }
      }

      if (!finalSpec) {
        warnings.push(`Could not match "${item.mediaPartner}" to any known spec`);
      }

      const maxFileSizeKB = finalSpec?.fileSizeLimit.maxKB ?? 0;
      let videoDuration: string | undefined;
      if (finalSpec?.videoSpecs) {
        const vs = finalSpec.videoSpecs;
        if (vs.recommendedDurationSeconds) {
          videoDuration = vs.recommendedDurationSeconds.map((d) => `:${d}s`).join(", ");
        } else {
          videoDuration = `max :${vs.maxDurationSeconds}s`;
        }
      }

      requirements.push({
        lineItemId: item.id,
        dimension,
        matchedSpec: finalSpec,
        matchConfidence: finalConfidence,
        requiredFormats: finalSpec?.supportedFormats ?? [],
        maxFileSizeKB,
        maxFileSizeDisplay: maxFileSizeKB ? formatFileSize(maxFileSizeKB) : "N/A",
        videoDuration,
        warnings,
      });
    }
  }

  return requirements;
}
