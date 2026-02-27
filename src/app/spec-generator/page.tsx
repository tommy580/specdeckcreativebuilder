"use client";

import { useState, useCallback, useEffect } from "react";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreativeSpec, MediaPlanLineItem, MediaPlanMetadata, SpecRequirement } from "@/lib/types";
import { generateSpecRequirements } from "@/lib/spec-engine";
import { formatFileSize } from "@/lib/utils";
import { FileSpreadsheet, Download, ChevronDown, ChevronRight, Copy, Check, AlertTriangle } from "lucide-react";

type Step = "upload" | "review" | "specs";

export default function SpecGeneratorPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [metadata, setMetadata] = useState<MediaPlanMetadata | null>(null);
  const [lineItems, setLineItems] = useState<MediaPlanLineItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [specs, setSpecs] = useState<CreativeSpec[]>([]);
  const [specRequirements, setSpecRequirements] = useState<SpecRequirement[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/specs")
      .then((res) => res.json())
      .then((data) => setSpecs(data))
      .catch(() => {});
  }, []);

  const handleFileSelected = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setLoading(true);

    // Get sheet names
    const formData = new FormData();
    formData.append("file", f);
    formData.append("action", "sheets");

    try {
      const res = await fetch("/api/parse-media-plan", { method: "POST", body: formData });
      const data = await res.json();
      if (data.sheets && data.sheets.length > 1) {
        setSheets(data.sheets);
        setSelectedSheet(data.sheets[0]);
      } else if (data.sheets && data.sheets.length === 1) {
        setSelectedSheet(data.sheets[0]);
        await parsePlan(f, data.sheets[0]);
      }
    } catch {
      setWarnings(["Failed to read file. Please ensure it's a valid Excel/CSV file."]);
    }
    setLoading(false);
  }, []);

  const parsePlan = async (f: File, sheet: string) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", f);
    formData.append("sheetName", sheet);

    try {
      const res = await fetch("/api/parse-media-plan", { method: "POST", body: formData });
      const data = await res.json();
      setMetadata(data.metadata);
      setLineItems(data.lineItems);
      setWarnings(data.warnings || []);
      setStep("review");
    } catch {
      setWarnings(["Failed to parse media plan."]);
    }
    setLoading(false);
  };

  const handleSheetConfirm = async () => {
    if (file && selectedSheet) {
      await parsePlan(file, selectedSheet);
    }
  };

  const handleGenerateSpecs = () => {
    const requirements = generateSpecRequirements(lineItems, specs);
    setSpecRequirements(requirements);
    setStep("specs");
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copySpec = (req: SpecRequirement) => {
    const text = [
      `Dimension: ${req.dimension}`,
      `Creative Type: ${req.matchedSpec?.creativeType || "Unknown"}`,
      `Formats: ${req.requiredFormats.join(", ")}`,
      `Max File Size: ${req.maxFileSizeDisplay}`,
      req.videoDuration ? `Video Duration: ${req.videoDuration}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopiedId(`${req.lineItemId}-${req.dimension}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = () => {
    const headers = [
      "Line Item",
      "Channel",
      "Media Partner",
      "Creative Type",
      "Dimension",
      "Accepted Formats",
      "Max File Size",
      "Video Duration",
      "Status",
      "Warnings",
    ];

    const rows = specRequirements.map((req) => {
      const item = lineItems.find((li) => li.id === req.lineItemId);
      return [
        item?.mediaPartner || "",
        item?.channel || "",
        item?.mediaPartner || "",
        req.matchedSpec?.creativeType || "Not Found",
        req.dimension,
        req.requiredFormats.join("; "),
        req.maxFileSizeDisplay,
        req.videoDuration || "",
        req.matchConfidence === "exact"
          ? "Matched"
          : req.matchConfidence === "fuzzy"
          ? "Review"
          : "Not Found",
        req.warnings.join("; "),
      ];
    });

    const csv =
      [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spec-requirements-${metadata?.client || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (confidence: "exact" | "fuzzy" | "none") => {
    switch (confidence) {
      case "exact":
        return <Badge variant="success">Matched</Badge>;
      case "fuzzy":
        return <Badge variant="warning">Review</Badge>;
      case "none":
        return <Badge variant="destructive">Not Found</Badge>;
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setSheets([]);
    setSelectedSheet("");
    setMetadata(null);
    setLineItems([]);
    setWarnings([]);
    setSpecRequirements([]);
    setExpandedRows(new Set());
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spec Generator</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload a media plan to generate creative spec requirements
          </p>
        </div>
        {step !== "upload" && (
          <Button variant="outline" onClick={handleReset}>
            Start Over
          </Button>
        )}
      </div>

      {/* Step indicators */}
      <div className="mb-8 flex items-center gap-4">
        {[
          { id: "upload", label: "1. Upload" },
          { id: "review", label: "2. Review Plan" },
          { id: "specs", label: "3. Spec Output" },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s.id
                  ? "bg-inmarket text-white"
                  : ["upload", "review", "specs"].indexOf(step) >
                    ["upload", "review", "specs"].indexOf(s.id as Step)
                  ? "bg-inmarket/20 text-inmarket"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${
                step === s.id ? "font-medium text-gray-900" : "text-gray-500"
              }`}
            >
              {s.label}
            </span>
            {i < 2 && <div className="mx-2 h-px w-12 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="max-w-2xl">
          <FileUpload
            accept=".xlsx,.xls,.csv"
            onFilesSelected={handleFileSelected}
            label="Upload Media Plan"
            description="Drag & drop your .xlsx, .xls, or .csv file here"
          />

          {loading && (
            <p className="mt-4 text-sm text-gray-500">Reading file...</p>
          )}

          {sheets.length > 1 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Select Sheet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-gray-500">
                  Multiple sheets detected. Select the one containing the media plan:
                </p>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="mt-4"
                  onClick={handleSheetConfirm}
                  disabled={loading}
                >
                  Parse Selected Sheet
                </Button>
              </CardContent>
            </Card>
          )}

          {warnings.length > 0 && step === "upload" && (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Warnings</span>
              </div>
              <ul className="mt-2 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-sm text-yellow-700">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Review Plan */}
      {step === "review" && (
        <div>
          {metadata && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Media Plan Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                  {metadata.client && (
                    <div>
                      <span className="text-gray-500">Client:</span>{" "}
                      <span className="font-medium">{metadata.client}</span>
                    </div>
                  )}
                  {metadata.campaign && (
                    <div>
                      <span className="text-gray-500">Campaign:</span>{" "}
                      <span className="font-medium">{metadata.campaign}</span>
                    </div>
                  )}
                  {metadata.timePeriod && (
                    <div>
                      <span className="text-gray-500">Time Period:</span>{" "}
                      <span className="font-medium">{metadata.timePeriod}</span>
                    </div>
                  )}
                  {metadata.agency && (
                    <div>
                      <span className="text-gray-500">Agency:</span>{" "}
                      <span className="font-medium">{metadata.agency}</span>
                    </div>
                  )}
                  {metadata.agencyContact && (
                    <div>
                      <span className="text-gray-500">Contact:</span>{" "}
                      <span className="font-medium">{metadata.agencyContact}</span>
                    </div>
                  )}
                  {metadata.product && (
                    <div>
                      <span className="text-gray-500">Product:</span>{" "}
                      <span className="font-medium">{metadata.product}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {warnings.length > 0 && (
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Parse Warnings</span>
              </div>
              <ul className="mt-2 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-sm text-yellow-700">{w}</li>
                ))}
              </ul>
            </div>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">
                Parsed Line Items ({lineItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Media Partner</TableHead>
                    <TableHead>Run Dates</TableHead>
                    <TableHead>Ad Units</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.channel}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.mediaPartner}
                      </TableCell>
                      <TableCell>{item.runDates}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.adUnits.map((u, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {u}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.totalImpressions
                          ? item.totalImpressions.toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.totalMediaSpend
                          ? `$${item.totalMediaSpend.toLocaleString()}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Button onClick={handleGenerateSpecs} disabled={lineItems.length === 0}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Generate Spec Requirements
          </Button>
        </div>
      )}

      {/* Step 3: Spec Output */}
      {step === "specs" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="success">
                {specRequirements.filter((r) => r.matchConfidence === "exact").length} Matched
              </Badge>
              <Badge variant="warning">
                {specRequirements.filter((r) => r.matchConfidence === "fuzzy").length} Review
              </Badge>
              <Badge variant="destructive">
                {specRequirements.filter((r) => r.matchConfidence === "none").length} Not Found
              </Badge>
            </div>
            <Button onClick={exportCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Channel</TableHead>
                    <TableHead>Media Partner</TableHead>
                    <TableHead>Creative Type</TableHead>
                    <TableHead>Dimension</TableHead>
                    <TableHead>Formats</TableHead>
                    <TableHead>Max File Size</TableHead>
                    <TableHead>Video</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specRequirements.map((req) => {
                    const item = lineItems.find((li) => li.id === req.lineItemId);
                    const rowId = `${req.lineItemId}-${req.dimension}`;
                    const isExpanded = expandedRows.has(rowId);

                    return (
                      <>
                        <TableRow
                          key={rowId}
                          className="cursor-pointer"
                          onClick={() => toggleRow(rowId)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell>{item?.channel}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {item?.mediaPartner}
                          </TableCell>
                          <TableCell>
                            {req.matchedSpec?.creativeType || (
                              <span className="text-gray-400">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{req.dimension}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {req.requiredFormats.join(", ")}
                          </TableCell>
                          <TableCell>{req.maxFileSizeDisplay}</TableCell>
                          <TableCell className="text-xs">
                            {req.videoDuration || "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(req.matchConfidence)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                copySpec(req);
                              }}
                            >
                              {copiedId === rowId ? (
                                <Check className="h-4 w-4 text-inmarket" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${rowId}-detail`}>
                            <TableCell colSpan={10} className="bg-gray-50">
                              <div className="grid grid-cols-2 gap-4 p-2 text-sm md:grid-cols-4">
                                {req.matchedSpec && (
                                  <>
                                    <div>
                                      <span className="text-gray-500">Category:</span>{" "}
                                      {req.matchedSpec.category}
                                    </div>
                                    {req.matchedSpec.platform && (
                                      <div>
                                        <span className="text-gray-500">Platform:</span>{" "}
                                        {req.matchedSpec.platform}
                                      </div>
                                    )}
                                    {req.matchedSpec.fileSizeLimit.recommendedKB && (
                                      <div>
                                        <span className="text-gray-500">
                                          Recommended Size:
                                        </span>{" "}
                                        {formatFileSize(
                                          req.matchedSpec.fileSizeLimit.recommendedKB
                                        )}
                                      </div>
                                    )}
                                    {req.matchedSpec.videoSpecs?.frameRates && (
                                      <div>
                                        <span className="text-gray-500">Frame Rates:</span>{" "}
                                        {req.matchedSpec.videoSpecs.frameRates.join(", ")} fps
                                      </div>
                                    )}
                                    {req.matchedSpec.textSpecs && (
                                      <div className="col-span-2">
                                        <span className="text-gray-500">Text Limits:</span>{" "}
                                        {Object.entries(req.matchedSpec.textSpecs)
                                          .map(([k, v]) => `${k}: ${v}`)
                                          .join(" | ")}
                                      </div>
                                    )}
                                  </>
                                )}
                                {req.warnings.length > 0 && (
                                  <div className="col-span-full">
                                    <span className="text-yellow-700">Warnings: </span>
                                    {req.warnings.join("; ")}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
