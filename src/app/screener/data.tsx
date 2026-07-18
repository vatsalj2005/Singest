"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Sparkles } from "lucide-react";
import { fmtPrice, fmtPct, fmtCr, fmtN, fmtInt, pctCls, mcapBadge } from "@/lib/format";
import type { ScreenerRow } from "@/lib/types";
import { COLS, type Filters } from "./types";

type DataProps = {
  appliedFilters: Filters;
};

export function DataTable({ appliedFilters }: DataProps) {
  const [sort, setSort] = useState<string>("mcap");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const limit = 50;

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [appliedFilters]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (appliedFilters.mcapclass.length) p.set("mcapclass", appliedFilters.mcapclass.join(","));
    if (appliedFilters.pe_min) p.set("pe_min", appliedFilters.pe_min);
    if (appliedFilters.pe_max) p.set("pe_max", appliedFilters.pe_max);
    if (appliedFilters.roce_min) p.set("roce_min", appliedFilters.roce_min);
    if (appliedFilters.roe_min) p.set("roe_min", appliedFilters.roe_min);
    if (appliedFilters.div_yield_min) p.set("div_yield_min", appliedFilters.div_yield_min);
    p.set("sort", sort);
    p.set("order", order);
    p.set("page", String(page));
    p.set("limit", String(limit));
    return p.toString();
  }, [appliedFilters, sort, order, page]);

  const [resultsData, setResultsData] = useState<{ rows: ScreenerRow[]; total: number } | null>(
    null,
  );
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultsFetching, setResultsFetching] = useState(false);

  useEffect(() => {
    let active = true;
    setResultsFetching(true);
    fetch(`/api/screener/customScans?${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setResultsData(data);
          setResultsLoading(false);
          setResultsFetching(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setResultsLoading(false);
          setResultsFetching(false);
        }
      });
    return () => {
      active = false;
    };
  }, [qs]);

  function toggleSort(k: string) {
    setPage(1);
    if (sort === k) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(k);
      setOrder("desc");
    }
  }

  const total = resultsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIdx = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIdx = Math.min(total, page * limit);

  return (
    <section className="stagger mt-8" style={{ animationDelay: "160ms" }}>
      <div className="glass-card overflow-hidden rounded-2xl">
        {resultsLoading ? (
          <SkeletonTable />
        ) : (resultsData?.rows.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center text-sm text-muted-foreground">
            <Sparkles className="h-8 w-8 opacity-50" />
            No stocks match your criteria. Try adjusting your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/30 bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    #
                  </th>
                  {COLS.map((c) => {
                    const isSorted = c.sortable && sort === c.key;
                    const Icon = isSorted
                      ? order === "asc"
                        ? ChevronUp
                        : ChevronDown
                      : ChevronsUpDown;
                    return (
                      <th
                        key={c.key}
                        onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                        className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                          c.align === "right" ? "text-right" : "text-left"
                        } ${c.sortable ? "cursor-pointer hover:text-foreground" : ""}`}
                      >
                        <span
                          className={`inline-flex items-center gap-1 ${c.align === "right" ? "justify-end" : ""}`}
                        >
                          {c.header}
                          {c.sortable && (
                            <Icon
                              className={`h-3 w-3 ${isSorted ? "text-primary" : "opacity-40"}`}
                            />
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody
                className={resultsFetching ? "opacity-60 transition-opacity" : "transition-opacity"}
              >
                {resultsData?.rows.map((r, i) => (
                  <tr
                    key={r.isin}
                    style={{
                      animationDelay: `${Math.min(i, 20) * 18}ms`,
                    }}
                    className="animate-[singest-stagger_0.3s_ease-out_both] border-b border-border/40 transition-colors hover:bg-accent/40 even:bg-muted/35 odd:bg-card/35"
                  >
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{startIdx + i}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`/stock/${r.isin}`}
                        className="font-medium transition-colors hover:text-cyan-300"
                      >
                        {r.disp_sym || r.sym}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{r.sym}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {fmtPrice(r.ltp)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${pctCls(r.pperchange)}`}
                    >
                      {fmtPct(r.pperchange)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {fmtCr(r.mcap)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.mcapclass ? (
                        <span
                          className={`rounded-md border px-2 py-0.5 text-xs font-medium ${mcapBadge(r.mcapclass)}`}
                        >
                          {r.mcapclass}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {fmtN(r.pe)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {fmtN(r.pb)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {fmtPct(r.div_yeild)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {fmtPct(r.roce)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {fmtPct(r.roe)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {fmtPrice(r.eps)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {fmtPct(r.net_profit_margin)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${pctCls(r.price_perchng_1year)}`}
                    >
                      {fmtPct(r.price_perchng_1year)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {fmtInt(r.volume)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-white/[0.02] px-5 py-3 text-sm">
          <div className="text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground tabular-nums">
              {startIdx.toLocaleString("en-IN")}-{endIdx.toLocaleString("en-IN")}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground tabular-nums">
              {total.toLocaleString("en-IN")}
            </span>{" "}
            stocks
          </div>
          <div className="flex items-center gap-2">
            <PageBtn disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </PageBtn>
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {page} / {totalPages}
            </span>
            <PageBtn
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </PageBtn>
          </div>
        </div>
      </div>
    </section>
  );
}

type PageBtnProps = {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

function PageBtn({ children, disabled, onClick }: PageBtnProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-border bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-white/[0.03] disabled:hover:shadow-none"
    >
      {children}
    </button>
  );
}

function SkeletonTable() {
  return (
    <div className="p-5">
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-md bg-white/[0.04]"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
