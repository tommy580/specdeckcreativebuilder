import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(kb: number): string {
  if (kb >= 1048576) {
    return `${(kb / 1048576).toFixed(1)} GB`;
  }
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(kb % 1024 === 0 ? 0 : 1)} MB`;
  }
  return `${kb} KB`;
}

export function formatFileSizeBytes(bytes: number): string {
  const kb = bytes / 1024;
  return formatFileSize(kb);
}
