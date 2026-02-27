import { NextResponse } from "next/server";
import { parseMediaPlan, getSheetNames } from "@/lib/parse-media-plan";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sheetName = formData.get("sheetName") as string | null;
    const action = formData.get("action") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();

    // If action is "sheets", just return sheet names
    if (action === "sheets") {
      const sheets = getSheetNames(buffer);
      return NextResponse.json({ sheets });
    }

    // Otherwise parse the media plan
    const result = parseMediaPlan(buffer, sheetName || undefined);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to parse media plan:", error);
    return NextResponse.json(
      { error: "Failed to parse media plan" },
      { status: 500 }
    );
  }
}
