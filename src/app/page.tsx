"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, CheckCircle, Library, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { CreativeSpec } from "@/lib/types";

export default function HomePage() {
  const [specCount, setSpecCount] = useState(0);

  useEffect(() => {
    fetch("/api/specs")
      .then((res) => res.json())
      .then((specs: CreativeSpec[]) => setSpecCount(specs.length))
      .catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">SpecDeck</h1>
        <p className="mt-2 text-gray-500">
          InMarket Creative Ad Specs & QA Platform
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-inmarket/10">
              <Library className="h-6 w-6 text-inmarket" />
            </div>
            <div>
              <p className="text-2xl font-bold">{specCount}</p>
              <p className="text-sm text-muted-foreground">Specs in Library</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
              <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">7</p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">3</p>
              <p className="text-sm text-muted-foreground">QA Checks per Asset</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Link href="/spec-generator">
          <Card className="group cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-inmarket/10">
                  <FileSpreadsheet className="h-6 w-6 text-inmarket" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1" />
              </div>
              <CardTitle className="mt-4">Spec Generator</CardTitle>
              <CardDescription>
                Upload a media plan (Excel/CSV) to automatically parse placements
                and generate exact creative specs needed for each line item.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  Excel Upload
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  Auto-Parse
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  Spec Matching
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  CSV Export
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/asset-qa">
          <Card className="group cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1" />
              </div>
              <CardTitle className="mt-4">Asset QA Checker</CardTitle>
              <CardDescription>
                Upload finalized creative assets to validate file type, dimensions,
                and file size against required specs. Get a pass/fail QA report.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  Multi-File Upload
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  File Type Check
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  Dimension Check
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  Size Check
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
