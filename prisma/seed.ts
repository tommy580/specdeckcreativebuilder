import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  const specsPath = path.join(process.cwd(), "data", "inmarket-specs.json");
  const specsData = JSON.parse(fs.readFileSync(specsPath, "utf-8"));

  for (const spec of specsData) {
    await prisma.creativeSpec.upsert({
      where: { id: spec.id },
      update: {
        creativeType: spec.creativeType,
        category: spec.category,
        platform: spec.platform ?? null,
        placement: spec.placement ?? null,
        dimensions: JSON.stringify(spec.dimensions),
        supportedFormats: JSON.stringify(spec.supportedFormats),
        fileSizeLimit: JSON.stringify(spec.fileSizeLimit),
        videoSpecs: spec.videoSpecs ? JSON.stringify(spec.videoSpecs) : null,
        textSpecs: spec.textSpecs ? JSON.stringify(spec.textSpecs) : null,
        notes: spec.notes ?? null,
      },
      create: {
        id: spec.id,
        creativeType: spec.creativeType,
        category: spec.category,
        platform: spec.platform ?? null,
        placement: spec.placement ?? null,
        dimensions: JSON.stringify(spec.dimensions),
        supportedFormats: JSON.stringify(spec.supportedFormats),
        fileSizeLimit: JSON.stringify(spec.fileSizeLimit),
        videoSpecs: spec.videoSpecs ? JSON.stringify(spec.videoSpecs) : null,
        textSpecs: spec.textSpecs ? JSON.stringify(spec.textSpecs) : null,
        notes: spec.notes ?? null,
      },
    });
  }

  console.log(`Seeded ${specsData.length} creative specs.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
