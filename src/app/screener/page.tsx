"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { ThemeToggle } from "@/lib/ThemeToggle";
import { FilterBar } from "./filter";
import { DataTable } from "./data";
import { type Filters, EMPTY } from "./types";

export default function ScreenerPage() {
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [facetsData, setFacetsData] = useState<{ mcapclasses: string[]; total: number } | null>(
    null,
  );
  const [facetsLoading, setFacetsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/screener/facets")
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setFacetsData(data);
          setFacetsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setFacetsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleApply(filters: Filters) {
    setApplied(filters);
  }

  function handleReset() {
    setApplied(EMPTY);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="bg-grain-fixed"
        style={{
          background:
            "radial-gradient(60% 50% at 80% -10%, oklch(0.35 0.12 155 / 0.3), transparent 60%), radial-gradient(50% 40% at 0% 0%, oklch(0.35 0.12 250 / 0.22), transparent 60%)",
        }}
      />
      <header className="sticky top-0 z-30 border-b border-border/60 backdrop-blur-md bg-background/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Singest</span>
            </Link>
            <Link href="/screener" className="text-sm font-semibold text-primary">
              Screener
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-xs text-muted-foreground sm:block">Live • NSE / BSE</div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="stagger">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Stock Screener</h1>
          <p className="mt-2 text-muted-foreground">
            Filter and analyze{" "}
            <span className="font-semibold text-foreground">
              {facetsData?.total?.toLocaleString("en-IN") ?? "…"}
            </span>{" "}
            NSE-listed stocks
          </p>
        </section>

        {/* Filter component */}
        <FilterBar
          facetsData={facetsData}
          facetsLoading={facetsLoading}
          onApply={handleApply}
          onReset={handleReset}
          appliedFilters={applied}
        />

        {/* Data Table component */}
        <DataTable appliedFilters={applied} />

        <footer className="mt-16 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          Singest · Data refreshed live from the markets. Not investment advice.
        </footer>
      </main>
    </div>
  );
}
