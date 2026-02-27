import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import { MediaPlanMetadata, MediaPlanLineItem, ParsedMediaPlan } from "./types";

const METADATA_LABELS: Record<string, keyof MediaPlanMetadata> = {
  client: "client",
  campaign: "campaign",
  "time period": "timePeriod",
  agency: "agency",
  "agency contact": "agencyContact",
};

const SUMMARY_KEYWORDS = [
  "total",
  "subtotal",
  "grand total",
  "digital total",
  "sum",
  "net total",
];

function isSummaryRow(values: (string | number | null)[]): boolean {
  return values.some((v) => {
    if (typeof v !== "string") return false;
    const lower = v.toLowerCase().trim();
    return SUMMARY_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

function isBlankRow(values: (string | number | null)[]): boolean {
  return values.every((v) => v === null || v === undefined || String(v).trim() === "");
}

function findHeaderRow(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range
): number | null {
  for (let r = range.s.r; r <= range.e.r; r++) {
    const rowValues: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      rowValues.push(cell ? String(cell.v).toLowerCase().trim() : "");
    }
    const hasChannel = rowValues.some(
      (v) => v.includes("channel") || v.includes("media channel")
    );
    const hasAdUnit = rowValues.some(
      (v) => v.includes("ad unit") || v.includes("ad size") || v.includes("creative size")
    );
    if (hasChannel && hasAdUnit) return r;
    // Also match if we see "media partner" and "impressions"
    const hasPartner = rowValues.some(
      (v) => v.includes("media partner") || v.includes("partner")
    );
    const hasImpressions = rowValues.some((v) => v.includes("impression"));
    if (hasPartner && hasImpressions) return r;
  }
  return null;
}

function detectColumnMapping(
  sheet: XLSX.WorkSheet,
  headerRow: number,
  range: XLSX.Range
): Record<string, number> {
  const mapping: Record<string, number> = {};
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (!cell) continue;
    const val = String(cell.v).toLowerCase().trim();
    if (val.includes("channel")) mapping.channel = c;
    else if (val.includes("media partner") || val.includes("partner"))
      mapping.mediaPartner = c;
    else if (val.includes("run date") || val.includes("flight"))
      mapping.runDates = c;
    else if (
      val.includes("ad unit") ||
      val.includes("ad size") ||
      val.includes("creative size")
    )
      mapping.adUnit = c;
    else if (val.includes("impression")) mapping.impressions = c;
    else if (val.includes("spend") || val.includes("cost") || val.includes("budget"))
      mapping.spend = c;
    else if (val.includes("note")) mapping.notes = c;
  }
  return mapping;
}

function getCellValue(
  sheet: XLSX.WorkSheet,
  r: number,
  c: number
): string | number | null {
  const cell = sheet[XLSX.utils.encode_cell({ r, c })];
  if (!cell) return null;
  return cell.v != null ? cell.v : null;
}

function parseAdUnits(adUnitStr: string): string[] {
  return adUnitStr
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => /^\d+x\d+$/i.test(s));
}

export function getSheetNames(buffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames;
}

export function parseMediaPlan(
  buffer: ArrayBuffer,
  sheetName?: string
): ParsedMediaPlan {
  const workbook = XLSX.read(buffer, { type: "array" });
  const targetSheet = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheet];

  if (!sheet) {
    return {
      metadata: {
        client: "",
        campaign: "",
        timePeriod: "",
        agency: "",
        agencyContact: "",
        contactEmail: "",
      },
      lineItems: [],
      warnings: [`Sheet "${targetSheet}" not found`],
    };
  }

  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const warnings: string[] = [];

  // Extract metadata from top rows
  const metadata: MediaPlanMetadata = {
    client: "",
    campaign: "",
    timePeriod: "",
    agency: "",
    agencyContact: "",
    contactEmail: "",
  };

  for (let r = range.s.r; r <= Math.min(range.s.r + 20, range.e.r); r++) {
    const labelCell = getCellValue(sheet, r, 0);
    const valueCell = getCellValue(sheet, r, 1);
    if (!labelCell) continue;

    const label = String(labelCell).toLowerCase().trim();

    // Check for metadata labels
    for (const [key, field] of Object.entries(METADATA_LABELS)) {
      if (label.includes(key) && valueCell) {
        (metadata as unknown as Record<string, string>)[field] = String(valueCell).trim();
      }
    }

    // Check for email pattern in value
    if (valueCell && String(valueCell).includes("@")) {
      metadata.contactEmail = String(valueCell).trim();
    }

    // Check for product line (often a row with text spanning columns)
    if (label.includes("product") && valueCell) {
      metadata.product = String(valueCell).trim();
    }
  }

  // Find header row
  const headerRow = findHeaderRow(sheet, range);
  if (headerRow === null) {
    warnings.push(
      "Could not find data table header row (looking for CHANNEL and AD UNIT columns)"
    );
    return { metadata, lineItems: [], warnings };
  }

  // Detect column mapping
  const colMap = detectColumnMapping(sheet, headerRow, range);

  if (colMap.channel === undefined && colMap.mediaPartner === undefined) {
    warnings.push("Could not detect required columns (CHANNEL, MEDIA PARTNER)");
    return { metadata, lineItems: [], warnings };
  }

  // Parse line items
  const lineItems: MediaPlanLineItem[] = [];
  let lastChannel = "";

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const rowValues: (string | number | null)[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      rowValues.push(getCellValue(sheet, r, c));
    }

    if (isBlankRow(rowValues)) continue;
    if (isSummaryRow(rowValues)) continue;

    const channel =
      colMap.channel !== undefined
        ? getCellValue(sheet, r, colMap.channel)
        : null;
    const mediaPartner =
      colMap.mediaPartner !== undefined
        ? getCellValue(sheet, r, colMap.mediaPartner)
        : null;
    const runDates =
      colMap.runDates !== undefined
        ? getCellValue(sheet, r, colMap.runDates)
        : null;
    const adUnit =
      colMap.adUnit !== undefined
        ? getCellValue(sheet, r, colMap.adUnit)
        : null;
    const impressions =
      colMap.impressions !== undefined
        ? getCellValue(sheet, r, colMap.impressions)
        : null;
    const spend =
      colMap.spend !== undefined ? getCellValue(sheet, r, colMap.spend) : null;
    const notes =
      colMap.notes !== undefined ? getCellValue(sheet, r, colMap.notes) : null;

    // Skip if no media partner and no ad unit
    if (!mediaPartner && !adUnit) continue;

    // Carry forward channel
    if (channel && String(channel).trim()) {
      lastChannel = String(channel).trim();
    }

    const adUnitStr = adUnit ? String(adUnit).trim() : "";
    const parsedAdUnits = adUnitStr ? parseAdUnits(adUnitStr) : [];

    if (parsedAdUnits.length === 0 && adUnitStr) {
      // If we have text but couldn't parse dimensions, add a warning
      warnings.push(
        `Row ${r + 1}: Could not parse dimensions from "${adUnitStr}"`
      );
    }

    // Only add if we have at least media partner text
    if (mediaPartner) {
      lineItems.push({
        id: uuidv4(),
        channel: lastChannel,
        mediaPartner: String(mediaPartner).trim(),
        runDates: runDates ? String(runDates).trim() : "",
        adUnits: parsedAdUnits.length > 0 ? parsedAdUnits : adUnitStr ? [adUnitStr] : [],
        totalImpressions: impressions ? Number(impressions) || 0 : 0,
        totalMediaSpend: spend ? Number(spend) || 0 : 0,
        notes: notes ? String(notes).trim() : "",
      });
    }
  }

  return { metadata, lineItems, warnings };
}
