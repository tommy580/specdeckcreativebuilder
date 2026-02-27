import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreativeSpec } from "@/lib/types";

function deserializeSpec(dbSpec: {
  id: string;
  creativeType: string;
  category: string;
  platform: string | null;
  placement: string | null;
  dimensions: string;
  supportedFormats: string;
  fileSizeLimit: string;
  videoSpecs: string | null;
  textSpecs: string | null;
  notes: string | null;
}): CreativeSpec {
  return {
    id: dbSpec.id,
    creativeType: dbSpec.creativeType,
    category: dbSpec.category,
    platform: dbSpec.platform || undefined,
    placement: dbSpec.placement || undefined,
    dimensions: JSON.parse(dbSpec.dimensions),
    supportedFormats: JSON.parse(dbSpec.supportedFormats),
    fileSizeLimit: JSON.parse(dbSpec.fileSizeLimit),
    videoSpecs: dbSpec.videoSpecs ? JSON.parse(dbSpec.videoSpecs) : null,
    textSpecs: dbSpec.textSpecs ? JSON.parse(dbSpec.textSpecs) : null,
    notes: dbSpec.notes || undefined,
  };
}

export async function GET() {
  try {
    const dbSpecs = await prisma.creativeSpec.findMany({
      orderBy: { category: "asc" },
    });
    const specs: CreativeSpec[] = dbSpecs.map(deserializeSpec);
    return NextResponse.json(specs);
  } catch (error) {
    console.error("Failed to fetch specs:", error);
    return NextResponse.json(
      { error: "Failed to fetch specs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const spec: CreativeSpec = await request.json();
    await prisma.creativeSpec.upsert({
      where: { id: spec.id },
      update: {
        creativeType: spec.creativeType,
        category: spec.category,
        platform: spec.platform || null,
        placement: spec.placement || null,
        dimensions: JSON.stringify(spec.dimensions),
        supportedFormats: JSON.stringify(spec.supportedFormats),
        fileSizeLimit: JSON.stringify(spec.fileSizeLimit),
        videoSpecs: spec.videoSpecs ? JSON.stringify(spec.videoSpecs) : null,
        textSpecs: spec.textSpecs ? JSON.stringify(spec.textSpecs) : null,
        notes: spec.notes || null,
      },
      create: {
        id: spec.id,
        creativeType: spec.creativeType,
        category: spec.category,
        platform: spec.platform || null,
        placement: spec.placement || null,
        dimensions: JSON.stringify(spec.dimensions),
        supportedFormats: JSON.stringify(spec.supportedFormats),
        fileSizeLimit: JSON.stringify(spec.fileSizeLimit),
        videoSpecs: spec.videoSpecs ? JSON.stringify(spec.videoSpecs) : null,
        textSpecs: spec.textSpecs ? JSON.stringify(spec.textSpecs) : null,
        notes: spec.notes || null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save spec:", error);
    return NextResponse.json(
      { error: "Failed to save spec" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await prisma.creativeSpec.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete spec:", error);
    return NextResponse.json(
      { error: "Failed to delete spec" },
      { status: 500 }
    );
  }
}
