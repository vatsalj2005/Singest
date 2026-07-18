"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search as SearchIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { fmtPrice, fmtPct } from "@/lib/format";
import type { StockSummary } from "@/lib/types";

export function Search({ popular, loading }: { popular: StockSummary[]; loading: boolean }) {
  return (
    <section className="mb-10">
      <div className="mt-6">
        <StockSearch />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground min-h-[2rem]">
        <span>Or explore:</span>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-6 w-20 animate-pulse rounded-full bg-white/[0.04]"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))
          : popular?.map((p, i) => (
              <Link
                key={p.isin}
                href={`/stock/${p.isin}`}
                className="stagger rounded-full border border-border bg-white/[0.03] px-3 py-1 text-xs text-foreground transition-all hover:border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {p.disp_sym || p.sym}
              </Link>
            ))}
      </div>
    </section>
  );
}

function StockSearch() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 500);
    return () => clearTimeout(t);
  }, [q]);

  const enabled = debounced.length >= 1;
  const [results, setResults] = useState<StockSummary[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (debounced.length < 1) {
      setResults([]);
      setIsFetching(false);
      return;
    }

    let active = true;
    setIsFetching(true);

    fetch(`/api/home/search?q=${encodeURIComponent(debounced)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setResults(data?.results ?? []);
          setIsFetching(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setResults([]);
          setIsFetching(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debounced]);

  return (
    <div className="relative">
      <div className="glass flex items-center gap-3 rounded-xl px-4 py-3">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by symbol or company name (e.g. RELIANCE, TCS)"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {enabled && (
        <div className="glass slide-down absolute z-20 mt-2 w-full overflow-hidden rounded-xl">
          {isFetching && <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>}
          {!isFetching && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">No matches.</div>
          )}
          {results.map((r) => {
            const up = (r.pperchange ?? 0) >= 0;
            return (
              <Link
                key={r.isin}
                href={`/stock/${r.isin}`}
                className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-3 first:border-t-0 hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.disp_sym}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.sym} · {r.mcapclass ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{fmtPrice(r.ltp)}</div>
                  <div
                    className={`flex items-center justify-end gap-1 text-xs ${
                      up ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {up ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {fmtPct(r.pperchange)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
