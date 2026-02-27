"use client";

import { ReactNode } from "react";
import { AppStateProvider } from "@/context/app-state";

export function Providers({ children }: { children: ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}
