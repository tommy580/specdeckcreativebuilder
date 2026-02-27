import { CreativeSpec, QACheck, AssetQAResult } from "./types";
import { formatFileSize } from "./utils";

// Magic bytes signatures for file type verification
const MAGIC_BYTES: Record<string, number[][]> = {
  JPG: [
    [0xff, 0xd8, 0xff],
  ],
  PNG: [
    [0x89, 0x50, 0x4e, 0x47],
  ],
  GIF: [
    [0x47, 0x49, 0x46, 0x38],
  ],
  MP4: [
    // ftyp box at offset 4
  ],
  MOV: [],
  SVG: [],
};

export function detectFileTypeFromBytes(bytes: Uint8Array, extension: string): string {
  // JPG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "JPG";
  }
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "PNG";
  }
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "GIF";
  }
  // MP4/MOV - check for ftyp box
  if (bytes.length > 8) {
    const ftypStr = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (ftypStr === "ftyp") {
      const brandStr = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (brandStr === "qt  " || brandStr.startsWith("qt")) return "MOV";
      return "MP4";
    }
    // MOV can also start with other atoms
    const atomType = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (atomType === "moov" || atomType === "mdat" || atomType === "wide" || atomType === "free") {
      return "MOV";
    }
  }
  // SVG - check for XML/SVG content
  const textStart = new TextDecoder().decode(bytes.slice(0, 200));
  if (textStart.includes("<svg") || textStart.includes("<?xml")) {
    return "SVG";
  }
  // M4V - same container as MP4
  if (extension.toUpperCase() === "M4V") return "M4V";

  // Fallback to extension
  return extension.toUpperCase();
}

export function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
}

export function parseDimensionFromFilename(filename: string): string | null {
  const match = filename.match(/(\d{2,4})x(\d{2,4})/i);
  if (match) return `${match[1]}x${match[2]}`;
  return null;
}

interface ValidationInput {
  filename: string;
  fileSizeBytes: number;
  fileBytes: Uint8Array;
  imageWidth?: number;
  imageHeight?: number;
  targetSpec: CreativeSpec;
  targetDimension: string;
}

export function validateAsset(input: ValidationInput): AssetQAResult {
  const {
    filename,
    fileSizeBytes,
    fileBytes,
    imageWidth,
    imageHeight,
    targetSpec,
    targetDimension,
  } = input;

  const checks: QACheck[] = [];
  const extension = getExtension(filename);
  const detectedType = detectFileTypeFromBytes(fileBytes, extension);

  // Check 1: File Type
  const isFormatSupported = targetSpec.supportedFormats.some(
    (f) => f.toUpperCase() === detectedType.toUpperCase() || f.toUpperCase() === extension.toUpperCase()
  );
  const isVideoFile = ["MP4", "MOV", "M4V"].includes(detectedType);
  const specSupportsVideo = targetSpec.videoSpecs !== null && targetSpec.videoSpecs !== undefined;

  let fileTypeStatus: "pass" | "fail" | "warning" = isFormatSupported ? "pass" : "fail";
  let fileTypeMessage: string | undefined;

  if (isVideoFile && !specSupportsVideo) {
    fileTypeStatus = "fail";
    fileTypeMessage = "Video file uploaded for static-only spec";
  }

  checks.push({
    checkName: "File Type",
    expected: targetSpec.supportedFormats.join(", "),
    actual: `${detectedType} (ext: .${extension.toLowerCase()})`,
    status: fileTypeStatus,
    message: fileTypeMessage,
  });

  // Check 2: Dimensions
  const [targetW, targetH] = targetDimension.split("x").map(Number);
  let dimStatus: "pass" | "fail" | "warning" = "fail";
  let dimMessage: string | undefined;

  if (imageWidth !== undefined && imageHeight !== undefined) {
    if (imageWidth === targetW && imageHeight === targetH) {
      dimStatus = "pass";
    } else {
      // Check retina multipliers
      const specDim = targetSpec.dimensions.find(
        (d) => d.width === targetW && d.height === targetH
      );
      if (specDim?.supportsRetina) {
        for (const mult of [2, 3]) {
          if (imageWidth === targetW * mult && imageHeight === targetH * mult) {
            dimStatus = "pass";
            dimMessage = `${mult}x retina size accepted`;
            break;
          }
        }
      }
      if (dimStatus === "fail") {
        dimMessage = `Expected ${targetDimension}, got ${imageWidth}x${imageHeight}`;
      }
    }
    checks.push({
      checkName: "Dimensions",
      expected: targetDimension,
      actual: `${imageWidth}x${imageHeight}`,
      status: dimStatus,
      message: dimMessage,
    });
  } else {
    checks.push({
      checkName: "Dimensions",
      expected: targetDimension,
      actual: "Could not read dimensions",
      status: "warning",
      message: "Unable to extract dimensions from file",
    });
  }

  // Check 3: File Size
  const fileSizeKB = fileSizeBytes / 1024;
  const maxKB = targetSpec.fileSizeLimit.maxKB;
  const recommendedKB = targetSpec.fileSizeLimit.recommendedKB;

  let sizeStatus: "pass" | "fail" | "warning" = "pass";
  let sizeMessage: string | undefined;

  if (fileSizeKB > maxKB) {
    sizeStatus = "fail";
    sizeMessage = `File size ${formatFileSize(Math.round(fileSizeKB))} exceeds max ${formatFileSize(maxKB)}`;
  } else if (recommendedKB && fileSizeKB > recommendedKB) {
    sizeStatus = "warning";
    sizeMessage = `File size exceeds recommended ${formatFileSize(recommendedKB)} (max ${formatFileSize(maxKB)})`;
  }

  checks.push({
    checkName: "File Size",
    expected: `≤ ${formatFileSize(maxKB)}`,
    actual: formatFileSize(Math.round(fileSizeKB)),
    status: sizeStatus,
    message: sizeMessage,
  });

  const overallStatus = checks.some((c) => c.status === "fail") ? "fail" : "pass";

  return {
    filename,
    targetSpec: `${targetSpec.creativeType} @ ${targetDimension}`,
    checks,
    overallStatus,
  };
}
