import { NextResponse } from "next/server";
import { validateAsset } from "@/lib/asset-validator";
import { CreativeSpec } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const specsJson = formData.get("specs") as string;
    const mappingsJson = formData.get("mappings") as string;

    if (!files.length || !specsJson || !mappingsJson) {
      return NextResponse.json(
        { error: "Missing files, specs, or mappings" },
        { status: 400 }
      );
    }

    const specs: CreativeSpec[] = JSON.parse(specsJson);
    const mappings: Record<string, { specId: string; dimension: string }> =
      JSON.parse(mappingsJson);

    const results = [];

    for (const file of files) {
      const mapping = mappings[file.name];
      if (!mapping) continue;

      const spec = specs.find((s) => s.id === mapping.specId);
      if (!spec) continue;

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Try to get image dimensions server-side
      let imageWidth: number | undefined;
      let imageHeight: number | undefined;

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext);

      if (isImage) {
        try {
          // Use sharp for image dimension extraction
          const sharp = (await import("sharp")).default;
          const metadata = await sharp(Buffer.from(buffer)).metadata();
          imageWidth = metadata.width;
          imageHeight = metadata.height;
        } catch {
          // Dimension extraction failed - will show as warning in results
        }
      }

      const result = validateAsset({
        filename: file.name,
        fileSizeBytes: file.size,
        fileBytes: bytes,
        imageWidth,
        imageHeight,
        targetSpec: spec,
        targetDimension: mapping.dimension,
      });

      results.push(result);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Failed to validate assets:", error);
    return NextResponse.json(
      { error: "Failed to validate assets" },
      { status: 500 }
    );
  }
}
