"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Inbox } from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CORPORATE_ACTION_TABS, type CorporateActionTabKey } from "@/lib/types";

type Row = Record<string, string | number | null>;

type ColDef = { header: string; key: string; type: "date" | "price" | "text" };

const COLS: Record<CorporateActionTabKey, ColDef[]> = {
  dividends: [
    { header: "Ex-Date", key: "ex_date", type: "date" },
    { header: "Announcement Date", key: "ann_date", type: "date" },
    { header: "Dividend Type", key: "div_type", type: "text" },
    { header: "LTP at Announcement", key: "ann_ltp", type: "price" },
    { header: "Record Date", key: "rec_date", type: "date" },
    { header: "Remarks", key: "rmk", type: "text" },
  ],
  bonus: [
    { header: "Ex-Date", key: "ex_date", type: "date" },
    { header: "Announcement Date", key: "ann_date", type: "date" },
    { header: "LTP at Announcement", key: "ann_ltp", type: "price" },
    { header: "Record Date", key: "rec_date", type: "date" },
    { header: "Details", key: "note", type: "text" },
    { header: "Remarks", key: "rmk", type: "text" },
  ],
  splits: [
    { header: "Ex-Date", key: "ex_date", type: "date" },
    { header: "Announcement Date", key: "ann_date", type: "date" },
    { header: "LTP at Announcement", key: "ann_ltp", type: "price" },
    { header: "Record Date", key: "rec_date", type: "date" },
    { header: "Split Details", key: "note", type: "text" },
    { header: "Remarks", key: "rmk", type: "text" },
  ],
  rights: [
    { header: "Ex-Date", key: "ex_date", type: "date" },
    { header: "Announcement Date", key: "ann_date", type: "date" },
    { header: "LTP at Announcement", key: "ann_ltp", type: "price" },
    { header: "Record Date", key: "rec_date", type: "date" },
    { header: "Details", key: "note", type: "text" },
    { header: "Remarks", key: "rmk", type: "text" },
  ],
  buybacks: [
    { header: "Ex-Date", key: "ex_date", type: "date" },
    { header: "Announcement Date", key: "ann_date", type: "date" },
    { header: "LTP at Announcement", key: "ann_ltp", type: "price" },
    { header: "Record Date", key: "rec_date", type: "date" },
    { header: "Details", key: "note", type: "text" },
    { header: "Remarks", key: "rmk", type: "text" },
  ],
  "quarterly-results": [
    { header: "Quarter (Ex-Date)", key: "ex_date", type: "date" },
    { header: "Announcement Date", key: "ann_date", type: "date" },
    { header: "LTP at Announcement", key: "ann_ltp", type: "price" },
    { header: "Record Date", key: "rec_date", type: "date" },
    { header: "Details", key: "note", type: "text" },
    { header: "Remarks", key: "rmk", type: "text" },
  ],
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(v: unknown): string {
  if (v == null || v === "") return "—";
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function isFuture(v: unknown): boolean {
  if (v == null || v === "") return false;
  const d = new Date(v as string).getTime();
  return !Number.isNaN(d) && d > Date.now();
}

function fmtPrice(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtText(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

export function CorporateActions({ isin }: { isin: string }) {
  const [active, setActive] = useState<CorporateActionTabKey>("dividends");
  const [loaded, setLoaded] = useState<Set<CorporateActionTabKey>>(new Set(["dividends"]));

  const [countsData, setCountsData] = useState<Record<CorporateActionTabKey, number> | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/stock/${isin}/corporateActions`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setCountsData(data);
      })
      .catch((err) => console.error(err));
    return () => {
      active = false;
    };
  }, [isin]);

  function selectTab(k: CorporateActionTabKey) {
    setActive(k);
    setLoaded((prev) => (prev.has(k) ? prev : new Set(prev).add(k)));
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">📋 Corporate Actions</h2>

      {/* Tab bar */}
      <div className="relative mb-4 flex flex-wrap items-end gap-1 border-b border-border/60">
        {CORPORATE_ACTION_TABS.map((t) => {
          const isActive = t.key === active;
          const count = countsData?.[t.key];
          return (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              className={`relative -mb-px inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-primary [text-shadow:0_0_12px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`inline-flex min-w-[1.5rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  count ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground"
                }`}
              >
                {count ?? "·"}
              </span>
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-primary shadow-[0_0_10px_color-mix(in_oklab,var(--primary)_70%,transparent)] animate-[singest-stagger_0.25s_ease-out]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="glass-card overflow-hidden rounded-xl">
        {CORPORATE_ACTION_TABS.map((t) =>
          t.key === active && loaded.has(t.key) ? (
            <TabPanel key={t.key} tab={t.key} isin={isin} />
          ) : null,
        )}
      </div>
    </section>
  );
}

function TabPanel({ tab, isin }: { tab: CorporateActionTabKey; isin: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetch(`/api/stock/${isin}/corporateActions?action=${tab}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setRows(data?.rows ?? []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isin, tab]);

  const [sortKey, setSortKey] = useState<string>("ex_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const cols = COLS[tab];

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const col = cols.find((c) => c.key === sortKey);
      if (col?.type === "date") {
        const at = new Date(av as string).getTime();
        const bt = new Date(bv as string).getTime();
        return sortDir === "asc" ? at - bt : bt - at;
      }
      if (col?.type === "price") {
        return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [rows, sortKey, sortDir, cols]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (isLoading) {
    return (
      <div className="animate-[singest-stagger_0.3s_ease-out] p-10 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (rows.length === 0) {
    const label =
      CORPORATE_ACTION_TABS.find((t) => t.key === tab)?.label.toLowerCase() ?? "records";
    return (
      <div className="animate-[singest-stagger_0.3s_ease-out] flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
        <Inbox className="h-8 w-8 opacity-50" />
        <span>No {label} records found for this stock.</span>
      </div>
    );
  }

  return (
    <div className="animate-[singest-stagger_0.3s_ease-out]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary/30 bg-muted/40">
              {cols.map((c) => {
                const isSorted = sortKey === c.key;
                const Icon = isSorted
                  ? sortDir === "asc"
                    ? ChevronUp
                    : ChevronDown
                  : ChevronsUpDown;
                return (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className="cursor-pointer whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.header}
                      <Icon className={`h-3 w-3 ${isSorted ? "text-primary" : "opacity-40"}`} />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => (
              <tr
                key={(r.row_hash as string) ?? idx}
                style={{
                  animationDelay: `${Math.min(idx, 12) * 25}ms`,
                }}
                className="animate-[singest-stagger_0.3s_ease-out_both] border-b border-border/40 transition-colors hover:bg-accent/40 even:bg-muted/35 odd:bg-card/35"
              >
                {cols.map((c) => (
                  <TableCell key={c.key} col={c} row={r} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tab === "dividends" && rows.length >= 3 && <DividendChart rows={sorted} />}
    </div>
  );
}

function TableCell({ col, row }: { col: ColDef; row: Row }) {
  const v = row[col.key];

  if (col.type === "date") {
    const txt = fmtDate(v);
    const upcoming = isFuture(v);
    return (
      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
        <span className="inline-flex items-center gap-2">
          {txt}
          {upcoming && (
            <span className="rounded-md border border-teal-500/40 bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-teal-300">
              Upcoming
            </span>
          )}
        </span>
      </td>
    );
  }

  if (col.type === "price") {
    return <td className="whitespace-nowrap px-4 py-3 tabular-nums">{fmtPrice(v)}</td>;
  }

  const text = fmtText(v);
  const isRmk = col.key === "rmk";
  if (isRmk && text !== "—") {
    return <td className="px-4 py-3 min-w-[280px] whitespace-normal break-words">{text}</td>;
  }
  return <td className="px-4 py-3 whitespace-normal break-words">{text}</td>;
}

function DividendChart({ rows }: { rows: Row[] }) {
  const data = useMemo(
    () =>
      [...rows]
        .reverse()
        .filter((r) => r.ex_date && r.ann_ltp != null)
        .map((r) => {
          const d = new Date(r.ex_date as string);
          const label = Number.isNaN(d.getTime())
            ? String(r.ex_date)
            : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
          return { date: label, value: Number(r.ann_ltp) };
        }),
    [rows],
  );

  if (data.length < 3) return null;

  return (
    <div className="border-t border-border/60 p-5">
      <h3 className="mb-4 text-sm font-semibold tracking-tight">Dividend Announcement Timeline</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(34,211,238)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="rgb(20,184,166)" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip
              cursor={{ fill: "color-mix(in oklab, var(--foreground) 4%, transparent)" }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              itemStyle={{ color: "var(--foreground)" }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(v: number) => [`₹${v.toFixed(2)}`, "LTP at announcement"]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={900}>
              {data.map((_, i) => (
                <Cell key={i} fill="url(#divGrad)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
