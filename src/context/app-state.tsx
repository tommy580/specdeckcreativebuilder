"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  CreativeSpec,
  MediaPlanLineItem,
  MediaPlanMetadata,
  SpecRequirement,
  AssetQAResult,
} from "@/lib/types";

// -- Spec Generator State --
type SpecGenStep = "upload" | "review" | "specs";

interface SpecGeneratorState {
  step: SpecGenStep;
  file: File | null;
  sheets: string[];
  selectedSheet: string;
  metadata: MediaPlanMetadata | null;
  lineItems: MediaPlanLineItem[];
  warnings: string[];
  specRequirements: SpecRequirement[];
  expandedRows: Set<string>;
}

// -- Asset QA State --
type AssetQAStep = "select-specs" | "upload" | "report";
type QAFilter = "all" | "pass" | "fail";

export interface FileMapping {
  file: File;
  specId: string;
  dimension: string;
}

interface AssetQAState {
  step: AssetQAStep;
  selectedSpecId: string;
  selectedDimension: string;
  targetSpecs: { specId: string; dimension: string; label: string }[];
  fileMappings: FileMapping[];
  results: AssetQAResult[];
  filter: QAFilter;
}

// -- Spec Library State --
interface SpecLibraryState {
  search: string;
  expandedSpecs: Set<string>;
}

// -- Context Shape --
interface AppStateContextValue {
  // Shared specs (fetched once, used by all pages)
  specs: CreativeSpec[];
  setSpecs: React.Dispatch<React.SetStateAction<CreativeSpec[]>>;
  specsLoaded: boolean;

  // Spec Generator
  specGen: SpecGeneratorState;
  setSpecGen: React.Dispatch<React.SetStateAction<SpecGeneratorState>>;

  // Asset QA
  assetQA: AssetQAState;
  setAssetQA: React.Dispatch<React.SetStateAction<AssetQAState>>;

  // Spec Library
  specLib: SpecLibraryState;
  setSpecLib: React.Dispatch<React.SetStateAction<SpecLibraryState>>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const initialSpecGen: SpecGeneratorState = {
  step: "upload",
  file: null,
  sheets: [],
  selectedSheet: "",
  metadata: null,
  lineItems: [],
  warnings: [],
  specRequirements: [],
  expandedRows: new Set(),
};

const initialAssetQA: AssetQAState = {
  step: "select-specs",
  selectedSpecId: "",
  selectedDimension: "",
  targetSpecs: [],
  fileMappings: [],
  results: [],
  filter: "all",
};

const initialSpecLib: SpecLibraryState = {
  search: "",
  expandedSpecs: new Set(),
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [specs, setSpecs] = useState<CreativeSpec[]>([]);
  const [specsLoaded, setSpecsLoaded] = useState(false);
  const [specGen, setSpecGen] = useState<SpecGeneratorState>(initialSpecGen);
  const [assetQA, setAssetQA] = useState<AssetQAState>(initialAssetQA);
  const [specLib, setSpecLib] = useState<SpecLibraryState>(initialSpecLib);

  // Fetch specs once at app level
  useEffect(() => {
    fetch("/api/specs")
      .then((res) => res.json())
      .then((data) => {
        setSpecs(data);
        setSpecsLoaded(true);
      })
      .catch(() => setSpecsLoaded(true));
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        specs,
        setSpecs,
        specsLoaded,
        specGen,
        setSpecGen,
        assetQA,
        setAssetQA,
        specLib,
        setSpecLib,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
