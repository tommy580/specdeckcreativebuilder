"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, FileSpreadsheet, CheckCircle, Library } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/spec-generator", label: "Spec Generator", icon: FileSpreadsheet },
  { href: "/asset-qa", label: "Asset QA", icon: CheckCircle },
  { href: "/spec-library", label: "Spec Library", icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-gray-900 text-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-700 px-6">
        <div className="h-8 w-8 rounded-md bg-inmarket flex items-center justify-center font-bold text-white text-sm">
          IM
        </div>
        <div>
          <h1 className="text-sm font-semibold">SpecDeck</h1>
          <p className="text-xs text-gray-400">InMarket Creative Specs</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-inmarket/20 text-inmarket"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-700 p-4">
        <p className="text-xs text-gray-500">InMarket 2025 Specs</p>
      </div>
    </aside>
  );
}
