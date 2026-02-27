"use client";

import { useAppState } from "@/context/app-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils";
import { Search, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

const CATEGORY_ORDER = [
  "Moments",
  "P/A Banners",
  "High-Impact",
  "OLV",
  "CTV",
  "Social",
  "Google PMax",
  "Instacart",
  "DOOH",
];

export default function SpecLibraryPage() {
  const { specs, setSpecs, specsLoaded, specLib, setSpecLib } = useAppState();

  const { search, expandedSpecs } = specLib;

  const filteredSpecs = specs.filter(
    (s) =>
      s.creativeType.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()) ||
      (s.platform && s.platform.toLowerCase().includes(search.toLowerCase()))
  );

  const groupedSpecs = CATEGORY_ORDER.reduce(
    (acc, category) => {
      const categorySpecs = filteredSpecs.filter((s) => s.category === category);
      if (categorySpecs.length > 0) {
        acc[category] = categorySpecs;
      }
      return acc;
    },
    {} as Record<string, typeof specs>
  );

  const toggleSpec = (id: string) => {
    setSpecLib((prev) => {
      const next = new Set(prev.expandedSpecs);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { ...prev, expandedSpecs: next };
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this spec?")) return;
    const res = await fetch("/api/specs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setSpecs((prev) => prev.filter((s) => s.id !== id));
    }
  };

  if (!specsLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Loading spec library...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spec Library</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and manage Five Eighty creative ad specifications
          </p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search specs by type, category, or platform..."
          value={search}
          onChange={(e) =>
            setSpecLib((prev) => ({ ...prev, search: e.target.value }))
          }
          className="pl-10"
        />
      </div>

      <div className="space-y-8">
        {Object.entries(groupedSpecs).map(([category, categorySpecs]) => (
          <div key={category}>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              {category}
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({categorySpecs.length} spec{categorySpecs.length !== 1 ? "s" : ""})
              </span>
            </h2>
            <div className="space-y-3">
              {categorySpecs.map((spec) => (
                <Card key={spec.id}>
                  <CardHeader
                    className="cursor-pointer py-4"
                    onClick={() => toggleSpec(spec.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedSpecs.has(spec.id) ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        <CardTitle className="text-base">{spec.creativeType}</CardTitle>
                        {spec.platform && (
                          <Badge variant="outline">{spec.platform}</Badge>
                        )}
                        {spec.placement && (
                          <Badge variant="secondary">{spec.placement}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">
                          {formatFileSize(spec.fileSizeLimit.maxKB)} max
                        </Badge>
                        {spec.videoSpecs && (
                          <Badge variant="outline">Video</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(spec.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {expandedSpecs.has(spec.id) && (
                    <CardContent className="border-t pt-4">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                          <h4 className="mb-2 text-sm font-medium text-gray-500">
                            Dimensions
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {spec.dimensions.map((dim, i) => (
                              <div
                                key={i}
                                className="rounded bg-gray-100 px-2 py-1 text-xs"
                              >
                                {dim.width}x{dim.height}
                                {dim.label && (
                                  <span className="ml-1 text-gray-400">
                                    ({dim.label})
                                  </span>
                                )}
                                {dim.supportsRetina && (
                                  <span className="ml-1 text-fiveeighty">@2x</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="mb-2 text-sm font-medium text-gray-500">
                            Accepted Formats
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {spec.supportedFormats.map((fmt) => (
                              <Badge key={fmt} variant="outline" className="text-xs">
                                {fmt}
                              </Badge>
                            ))}
                          </div>
                          <h4 className="mb-2 mt-4 text-sm font-medium text-gray-500">
                            File Size
                          </h4>
                          <p className="text-sm">
                            Max: {formatFileSize(spec.fileSizeLimit.maxKB)}
                            {spec.fileSizeLimit.recommendedKB && (
                              <span className="text-gray-400">
                                {" "}
                                (Recommended:{" "}
                                {formatFileSize(spec.fileSizeLimit.recommendedKB)})
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          {spec.videoSpecs && (
                            <>
                              <h4 className="mb-2 text-sm font-medium text-gray-500">
                                Video Specs
                              </h4>
                              <div className="space-y-1 text-sm">
                                {spec.videoSpecs.minDurationSeconds !== undefined && (
                                  <p>
                                    Min Duration: {spec.videoSpecs.minDurationSeconds}s
                                  </p>
                                )}
                                <p>
                                  Max Duration: {spec.videoSpecs.maxDurationSeconds}s
                                </p>
                                {spec.videoSpecs.recommendedDurationSeconds && (
                                  <p>
                                    Recommended:{" "}
                                    {spec.videoSpecs.recommendedDurationSeconds
                                      .map((d) => `${d}s`)
                                      .join(", ")}
                                  </p>
                                )}
                                <p>
                                  Formats:{" "}
                                  {spec.videoSpecs.supportedFormats.join(", ")}
                                </p>
                              </div>
                            </>
                          )}
                          {spec.textSpecs && (
                            <>
                              <h4 className="mb-2 mt-4 text-sm font-medium text-gray-500">
                                Text Specs
                              </h4>
                              <div className="space-y-1 text-sm">
                                {spec.textSpecs.primaryText && (
                                  <p>Primary Text: {spec.textSpecs.primaryText} chars</p>
                                )}
                                {spec.textSpecs.headline && (
                                  <p>Headline: {spec.textSpecs.headline} chars</p>
                                )}
                                {spec.textSpecs.description && (
                                  <p>Description: {spec.textSpecs.description} chars</p>
                                )}
                                {spec.textSpecs.brand && (
                                  <p>Brand: {spec.textSpecs.brand} chars</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredSpecs.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-gray-500">No specs found matching your search.</p>
        </div>
      )}
    </div>
  );
}
