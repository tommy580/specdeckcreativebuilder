"use client";

import { useState, useCallback } from "react";
import { useAppState, FileMapping } from "@/context/app-state";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseDimensionFromFilename } from "@/lib/asset-validator";
import { CheckCircle, XCircle, AlertTriangle, Download, FileCheck } from "lucide-react";

export default function AssetQAPage() {
  const { specs, assetQA, setAssetQA } = useAppState();

  // Transient UI state
  const [loading, setLoading] = useState(false);

  const {
    step,
    selectedSpecId,
    selectedDimension,
    targetSpecs,
    fileMappings,
    results,
    filter,
  } = assetQA;

  const selectedSpec = specs.find((s) => s.id === selectedSpecId);

  const addTargetSpec = () => {
    if (!selectedSpecId || !selectedDimension) return;
    const spec = specs.find((s) => s.id === selectedSpecId);
    if (!spec) return;

    const exists = targetSpecs.some(
      (t) => t.specId === selectedSpecId && t.dimension === selectedDimension
    );
    if (exists) return;

    setAssetQA((prev) => ({
      ...prev,
      targetSpecs: [
        ...prev.targetSpecs,
        {
          specId: selectedSpecId,
          dimension: selectedDimension,
          label: `${spec.creativeType} @ ${selectedDimension}`,
        },
      ],
    }));
  };

  const removeTargetSpec = (index: number) => {
    setAssetQA((prev) => ({
      ...prev,
      targetSpecs: prev.targetSpecs.filter((_, i) => i !== index),
    }));
  };

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const newMappings: FileMapping[] = files.map((file) => {
        const detectedDim = parseDimensionFromFilename(file.name);
        let autoSpec = "";
        let autoDim = "";

        if (detectedDim) {
          const match = targetSpecs.find((t) => t.dimension === detectedDim);
          if (match) {
            autoSpec = match.specId;
            autoDim = match.dimension;
          }
        }

        if (!autoSpec && targetSpecs.length > 0) {
          autoSpec = targetSpecs[0].specId;
          autoDim = targetSpecs[0].dimension;
        }

        return { file, specId: autoSpec, dimension: autoDim };
      });

      setAssetQA((prev) => ({
        ...prev,
        fileMappings: [...prev.fileMappings, ...newMappings],
      }));
    },
    [targetSpecs, setAssetQA]
  );

  const updateMapping = (index: number, specId: string, dimension: string) => {
    setAssetQA((prev) => ({
      ...prev,
      fileMappings: prev.fileMappings.map((m, i) =>
        i === index ? { ...m, specId, dimension } : m
      ),
    }));
  };

  const removeFile = (index: number) => {
    setAssetQA((prev) => ({
      ...prev,
      fileMappings: prev.fileMappings.filter((_, i) => i !== index),
    }));
  };

  const runValidation = async () => {
    setLoading(true);

    const formData = new FormData();
    fileMappings.forEach((m) => formData.append("files", m.file));
    formData.append("specs", JSON.stringify(specs));

    const mappingsObj: Record<string, { specId: string; dimension: string }> = {};
    fileMappings.forEach((m) => {
      mappingsObj[m.file.name] = { specId: m.specId, dimension: m.dimension };
    });
    formData.append("mappings", JSON.stringify(mappingsObj));

    try {
      const res = await fetch("/api/validate-assets", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setAssetQA((prev) => ({
        ...prev,
        results: data.results || [],
        step: "report",
      }));
    } catch {
      alert("Validation failed. Please try again.");
    }
    setLoading(false);
  };

  const filteredResults =
    filter === "all"
      ? results
      : results.filter((r) => r.overallStatus === filter);

  const passCount = results.filter((r) => r.overallStatus === "pass").length;
  const failCount = results.filter((r) => r.overallStatus === "fail").length;

  const exportQAReport = () => {
    const headers = [
      "Filename",
      "Target Spec",
      "File Type Status",
      "File Type Expected",
      "File Type Actual",
      "Dimensions Status",
      "Dimensions Expected",
      "Dimensions Actual",
      "File Size Status",
      "File Size Expected",
      "File Size Actual",
      "Overall Status",
    ];

    const rows = results.map((r) => {
      const fileTypeCheck = r.checks.find((c) => c.checkName === "File Type");
      const dimCheck = r.checks.find((c) => c.checkName === "Dimensions");
      const sizeCheck = r.checks.find((c) => c.checkName === "File Size");

      return [
        r.filename,
        r.targetSpec,
        fileTypeCheck?.status || "",
        fileTypeCheck?.expected || "",
        fileTypeCheck?.actual || "",
        dimCheck?.status || "",
        dimCheck?.expected || "",
        dimCheck?.actual || "",
        sizeCheck?.status || "",
        sizeCheck?.expected || "",
        sizeCheck?.actual || "",
        r.overallStatus,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qa-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setAssetQA({
      step: "select-specs",
      selectedSpecId: "",
      selectedDimension: "",
      targetSpecs: [],
      fileMappings: [],
      results: [],
      filter: "all",
    });
  };

  const getCheckIcon = (status: "pass" | "fail" | "warning") => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset QA Checker</h1>
          <p className="mt-1 text-sm text-gray-500">
            Validate creative assets against spec requirements
          </p>
        </div>
        {step !== "select-specs" && (
          <Button variant="outline" onClick={handleReset}>
            Start Over
          </Button>
        )}
      </div>

      {/* Step indicators */}
      <div className="mb-8 flex items-center gap-4">
        {[
          { id: "select-specs", label: "1. Select Specs" },
          { id: "upload", label: "2. Upload Assets" },
          { id: "report", label: "3. QA Report" },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s.id
                  ? "bg-fiveeighty text-white"
                  : ["select-specs", "upload", "report"].indexOf(step) >
                    ["select-specs", "upload", "report"].indexOf(s.id as typeof step)
                  ? "bg-fiveeighty/20 text-fiveeighty"
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

      {/* Step 1: Select Target Specs */}
      {step === "select-specs" && (
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Select Target Specs for Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Creative Type
                  </label>
                  <Select
                    value={selectedSpecId}
                    onValueChange={(v) => {
                      setAssetQA((prev) => ({
                        ...prev,
                        selectedSpecId: v,
                        selectedDimension: "",
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a creative type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {specs.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.creativeType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSpec && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Dimension
                    </label>
                    <Select
                      value={selectedDimension}
                      onValueChange={(v) =>
                        setAssetQA((prev) => ({ ...prev, selectedDimension: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select dimension..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedSpec.dimensions.map((dim, i) => (
                          <SelectItem
                            key={i}
                            value={`${dim.width}x${dim.height}`}
                          >
                            {dim.width}x{dim.height}
                            {dim.label ? ` (${dim.label})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={addTargetSpec}
                  disabled={!selectedSpecId || !selectedDimension}
                  variant="outline"
                >
                  Add Target Spec
                </Button>

                {targetSpecs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Target Specs ({targetSpecs.length})
                    </h4>
                    {targetSpecs.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2"
                      >
                        <span className="text-sm">{t.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTargetSpec(i)}
                          className="h-6 text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      className="mt-4"
                      onClick={() =>
                        setAssetQA((prev) => ({ ...prev, step: "upload" }))
                      }
                    >
                      Continue to Upload
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Upload Assets */}
      {step === "upload" && (
        <div>
          <FileUpload
            accept=".jpg,.jpeg,.png,.gif,.svg,.mp4,.mov,.m4v,.zip"
            multiple
            onFilesSelected={handleFilesSelected}
            label="Upload Creative Assets"
            description="Drag & drop your image or video files here (JPG, PNG, GIF, SVG, MP4, MOV)"
            className="mb-6"
          />

          {fileMappings.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">
                  Uploaded Files ({fileMappings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fileMappings.map((mapping, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {mapping.file.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(mapping.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Select
                        value={`${mapping.specId}|${mapping.dimension}`}
                        onValueChange={(v) => {
                          const [specId, dim] = v.split("|");
                          updateMapping(i, specId, dim);
                        }}
                      >
                        <SelectTrigger className="w-72">
                          <SelectValue placeholder="Select target spec..." />
                        </SelectTrigger>
                        <SelectContent>
                          {targetSpecs.map((t, j) => (
                            <SelectItem
                              key={j}
                              value={`${t.specId}|${t.dimension}`}
                            >
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(i)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={runValidation}
            disabled={fileMappings.length === 0 || loading}
          >
            <FileCheck className="mr-2 h-4 w-4" />
            {loading ? "Validating..." : "Run QA Validation"}
          </Button>
        </div>
      )}

      {/* Step 3: QA Report */}
      {step === "report" && (
        <div>
          {/* Summary */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <FileCheck className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{results.length}</p>
                  <p className="text-xs text-muted-foreground">Assets Checked</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{passCount}</p>
                  <p className="text-xs text-muted-foreground">Passed</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{failCount}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Export */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setAssetQA((prev) => ({ ...prev, filter: "all" }))
                }
              >
                Show All
              </Button>
              <Button
                variant={filter === "fail" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setAssetQA((prev) => ({ ...prev, filter: "fail" }))
                }
              >
                Failures Only
              </Button>
              <Button
                variant={filter === "pass" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setAssetQA((prev) => ({ ...prev, filter: "pass" }))
                }
              >
                Passes Only
              </Button>
            </div>
            <Button variant="outline" onClick={exportQAReport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV Report
            </Button>
          </div>

          {/* Results Cards */}
          <div className="space-y-4">
            {filteredResults.map((result, i) => (
              <Card
                key={i}
                className={
                  result.overallStatus === "fail"
                    ? "border-red-200"
                    : "border-green-200"
                }
              >
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {result.overallStatus === "pass" ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                      <div>
                        <CardTitle className="text-base">
                          {result.filename}
                        </CardTitle>
                        <p className="text-xs text-gray-500">
                          {result.targetSpec}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        result.overallStatus === "pass" ? "success" : "destructive"
                      }
                    >
                      {result.overallStatus === "pass" ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="border-t pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    {result.checks.map((check, j) => (
                      <div
                        key={j}
                        className={`rounded-lg border p-3 ${
                          check.status === "pass"
                            ? "border-green-100 bg-green-50"
                            : check.status === "warning"
                            ? "border-yellow-100 bg-yellow-50"
                            : "border-red-100 bg-red-50"
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          {getCheckIcon(check.status)}
                          <span className="text-sm font-medium">
                            {check.checkName}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <p>
                            <span className="text-gray-500">Expected:</span>{" "}
                            {check.expected}
                          </p>
                          <p>
                            <span className="text-gray-500">Actual:</span>{" "}
                            {check.actual}
                          </p>
                          {check.message && (
                            <p className="mt-1 text-gray-600">{check.message}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredResults.length === 0 && (
            <div className="mt-12 text-center">
              <p className="text-gray-500">No results match the current filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
