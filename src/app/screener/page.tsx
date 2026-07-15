"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  RotateCcw,
  Search as SearchIcon,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/lib/ThemeToggle";
import { fmtPrice, fmtPct, fmtCr, fmtN, fmtInt, pctCls, mcapBadge } from "@/lib/format";
import type { ScreenerRow } from "@/lib/types";

type Filters = {
  mcapclass: string[];
  pe_min: string;
  pe_max: string;
  roce_min: string;
  roe_min: string;
  div_yield_min: string;
};

const EMPTY: Filters = {
  mcapclass: [],
  pe_min: "",
  pe_max: "",
  roce_min: "",
  roe_min: "",
  div_yield_min: "",
};

const COLS: { key: keyof ScreenerRow; header: string; sortable: boolean; align?: "right" }[] = [
  { key: "disp_sym", header: "Name", sortable: false },
  { key: "sym", header: "Symbol", sortable: false },
  { key: "ltp", header: "CMP (₹)", sortable: true, align: "right" },
  { key: "pperchange", header: "Change %", sortable: true, align: "right" },
  { key: "mcap", header: "Mkt Cap (Cr.)", sortable: true, align: "right" },
  { key: "mcapclass", header: "Cap Class", sortable: false },
  { key: "pe", header: "P/E", sortable: true, align: "right" },
  { key: "pb", header: "P/B", sortable: true, align: "right" },
  { key: "div_yeild", header: "Div Yield %", sortable: true, align: "right" },
  { key: "roce", header: "ROCE %", sortable: true, align: "right" },
  { key: "roe", header: "ROE %", sortable: true, align: "right" },
  { key: "eps", header: "EPS", sortable: true, align: "right" },
  { key: "net_profit_margin", header: "NPM %", sortable: true, align: "right" },
  { key: "price_perchng_1year", header: "1Y Return %", sortable: true, align: "right" },
  { key: "volume", header: "Volume", sortable: true, align: "right" },
];

export default function ScreenerPage() {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<string>("mcap");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const limit = 50;

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

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (applied.mcapclass.length) p.set("mcapclass", applied.mcapclass.join(","));
    if (applied.pe_min) p.set("pe_min", applied.pe_min);
    if (applied.pe_max) p.set("pe_max", applied.pe_max);
    if (applied.roce_min) p.set("roce_min", applied.roce_min);
    if (applied.roe_min) p.set("roe_min", applied.roe_min);
    if (applied.div_yield_min) p.set("div_yield_min", applied.div_yield_min);
    p.set("sort", sort);
    p.set("order", order);
    p.set("page", String(page));
    p.set("limit", String(limit));
    return p.toString();
  }, [applied, sort, order, page]);

  const [resultsData, setResultsData] = useState<{ rows: ScreenerRow[]; total: number } | null>(
    null,
  );
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultsFetching, setResultsFetching] = useState(false);

  useEffect(() => {
    let active = true;
    setResultsFetching(true);
    fetch(`/api/screener?${qs}`, { cache: "no-store" })
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

  function toggleClass(c: string) {
    setDraft((d) =>
      d.mcapclass.includes(c)
        ? { ...d, mcapclass: d.mcapclass.filter((x) => x !== c) }
        : { ...d, mcapclass: [...d.mcapclass, c] },
    );
  }

  function applyFilters() {
    setPage(1);
    setApplied(draft);
  }

  function reset() {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  }

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
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
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

        {/* Filter bar */}
        <section
          className="stagger glass-card mt-8 rounded-2xl p-5"
          style={{ animationDelay: "80ms" }}
        >
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Market Cap Class
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(facetsData?.mcapclasses ?? []).map((c) => {
                  const active = draft.mcapclass.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleClass(c)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                        active
                          ? "border-primary/60 bg-primary/20 text-primary shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
                          : "border-border bg-white/[0.03] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
                {facetsLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
              </div>
            </div>

            <NumGroup
              label="P/E Range"
              className="lg:col-span-3"
              fields={[
                { ph: "Min", value: draft.pe_min, on: (v) => setDraft({ ...draft, pe_min: v }) },
                { ph: "Max", value: draft.pe_max, on: (v) => setDraft({ ...draft, pe_max: v }) },
              ]}
            />
            <NumGroup
              label="ROCE Min %"
              className="lg:col-span-1.5"
              fields={[
                { ph: "0", value: draft.roce_min, on: (v) => setDraft({ ...draft, roce_min: v }) },
              ]}
            />
            <NumGroup
              label="ROE Min %"
              className="lg:col-span-1.5"
              fields={[
                { ph: "0", value: draft.roe_min, on: (v) => setDraft({ ...draft, roe_min: v }) },
              ]}
            />
            <NumGroup
              label="Div Yield Min %"
              className="lg:col-span-2"
              fields={[
                {
                  ph: "0",
                  value: draft.div_yield_min,
                  on: (v) => setDraft({ ...draft, div_yield_min: v }),
                },
              ]}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={applyFilters}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_45%,transparent)] transition-all hover:brightness-110"
            >
              <SearchIcon className="h-3.5 w-3.5" /> Apply Filters
            </button>
          </div>
        </section>

        {/* Results */}
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
                    className={
                      resultsFetching ? "opacity-60 transition-opacity" : "transition-opacity"
                    }
                  >
                    {resultsData?.rows.map((r, i) => (
                      <tr
                        key={r.isin}
                        style={{
                          animationDelay: `${Math.min(i, 20) * 18}ms`,
                        }}
                        className="animate-[singest-stagger_0.3s_ease-out_both] border-b border-border/40 transition-colors hover:bg-accent/40 even:bg-muted/35 odd:bg-card/35"
                      >
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {startIdx + i}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Link
                            href={`/stock/${r.isin}`}
                            className="font-medium transition-colors hover:text-cyan-300"
                          >
                            {r.disp_sym || r.sym}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {r.sym}
                        </td>
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
      </main>
    </div>
  );
}

function NumGroup({
  label,
  className,
  fields,
}: {
  label: string;
  className?: string;
  fields: { ph: string; value: string; on: (v: string) => void }[];
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-2">
        {fields.map((f, i) => (
          <input
            key={i}
            type="number"
            inputMode="decimal"
            value={f.value}
            placeholder={f.ph}
            onChange={(e) => f.on(e.target.value)}
            className="w-full rounded-md border border-border bg-white/[0.03] px-3 py-1.5 text-sm tabular-nums outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:bg-white/[0.06]"
          />
        ))}
      </div>
    </div>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
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
