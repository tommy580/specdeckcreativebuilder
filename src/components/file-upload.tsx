"use client";

import React, { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  label?: string;
  description?: string;
  className?: string;
}

export function FileUpload({
  accept,
  multiple = false,
  onFilesSelected,
  label = "Upload files",
  description = "Drag & drop or click to browse",
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFilesSelected(files);
      }
      // Reset input value so same file can be re-uploaded
      e.target.value = "";
    },
    [onFilesSelected]
  );

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
        isDragging
          ? "border-inmarket bg-inmarket/5"
          : "border-gray-300 hover:border-inmarket/50 hover:bg-gray-50",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      <Upload className="mb-3 h-10 w-10 text-gray-400" />
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}
