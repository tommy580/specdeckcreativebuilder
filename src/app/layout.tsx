import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "SpecDeck - InMarket Creative Ad Specs",
  description: "Creative ad spec generator and asset QA checker for InMarket campaigns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
