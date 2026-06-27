"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ChevronsUpDown, Users } from "lucide-react";

type Peer = {
  isin: string;
  sym: string;
  disp_sym: string;
  ltp: number | null;
  pperchange: number | null;
  mcap: number | null;
  pe: number | null;
  div_yeild: number | null;
  roce: number | null;
  roe: number | null;
  eps: number | null;
  pb: number | null;
  net_profit_margin: number | null;
  volume: number | null;
};

const num = (v: unknown): number | null =>
  v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

const fmtN = (v: unknown, d = 2) => {
  const n = num(v);
  return n == null
    ? "—"
    : n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
};
const fmtPrice = (v: unknown) => {
  const n = num(v);
  return n == null
    ? "—"
    : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
};
const fmtPct = (v: unknown) => {
  const n = num(v);
  return n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
};
const pctCls = (v: unknown) => {
  const n = num(v);
  if (n == null) return "text-muted-foreground";
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-rose-400";
  return "text-muted-foreground";
};
const fmtCr = (v: unknown) => {
  const n = num(v);
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

type Col = {
  key: keyof Peer | "idx";
  header: string;
  sortable: boolean;
  align?: "left" | "right";
  render: (p: Peer, i: number, isCurrent: boolean) => React.ReactNode;
};

export function PeerComparison({ isin }: { isin: string }) {
  const [peersData, setPeersData] = useState<{
    mcapclass: string | null;
    peers: Peer[];
    currentIsin: string;
  } | null>(null);
  const [peersLoading, setPeersLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setPeersLoading(true);
    fetch(`/api/stock/${isin}/peers`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setPeersData(data);
          setPeersLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setPeersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isin]);

  const [sortKey, setSortKey] = useState<keyof Peer>("mcap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...(peersData?.peers ?? [])];
    arr.sort((a, b) => {
      const av = num(a[sortKey]);
      const bv = num(b[sortKey]);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [peersData, sortKey, sortDir]);

  const cols: Col[] = [
    {
      key: "idx",
      header: "#",
      sortable: false,
      render: (_p, i) => <span className="text-muted-foreground tabular-nums">{i + 1}</span>,
    },
    {
      key: "disp_sym",
      header: "Name",
      sortable: true,
      render: (p) => (
        <Link
          href={`/stock/${p.isin}`}
          className="font-medium text-foreground transition-colors hover:text-cyan-300"
        >
          {p.disp_sym || p.sym}
        </Link>
      ),
    },
    {
      key: "ltp",
      header: "CMP (₹)",
      sortable: true,
      align: "right",
      render: (p) => fmtPrice(p.ltp),
    },
    {
      key: "pperchange",
      header: "Change %",
      sortable: true,
      align: "right",
      render: (p) => <span className={pctCls(p.pperchange)}>{fmtPct(p.pperchange)}</span>,
    },
    {
      key: "mcap",
      header: "Mkt Cap (Cr.)",
      sortable: true,
      align: "right",
      render: (p) => fmtCr(p.mcap),
    },
    { key: "pe", header: "P/E", sortable: true, align: "right", render: (p) => fmtN(p.pe) },
    { key: "pb", header: "P/B", sortable: true, align: "right", render: (p) => fmtN(p.pb) },
    {
      key: "div_yeild",
      header: "Div Yield %",
      sortable: true,
      align: "right",
      render: (p) => fmtPct(p.div_yeild),
    },
    {
      key: "roce",
      header: "ROCE %",
      sortable: true,
      align: "right",
      render: (p) => fmtPct(p.roce),
    },
    { key: "roe", header: "ROE %", sortable: true, align: "right", render: (p) => fmtPct(p.roe) },
    {
      key: "net_profit_margin",
      header: "NPM %",
      sortable: true,
      align: "right",
      render: (p) => fmtPct(p.net_profit_margin),
    },
    { key: "eps", header: "EPS", sortable: true, align: "right", render: (p) => fmtPrice(p.eps) },
  ];

  function toggleSort(k: keyof Peer) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Users className="h-5 w-5" /> Peer Comparison
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Compared with other {peersData?.mcapclass ?? "peer"} stocks
      </p>

      <div className="glass-card mt-4 overflow-hidden rounded-xl">
        {peersLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading peers…</div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No peers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/30 bg-muted/40">
                  {cols.map((c) => {
                    const isSorted = c.sortable && sortKey === (c.key as keyof Peer);
                    const Icon = isSorted
                      ? sortDir === "asc"
                        ? ChevronUp
                        : ChevronDown
                      : ChevronsUpDown;
                    return (
                      <th
                        key={String(c.key)}
                        onClick={c.sortable ? () => toggleSort(c.key as keyof Peer) : undefined}
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
              <tbody>
                {sorted.map((p, i) => {
                  const isCurrent = p.isin === isin;
                  return (
                    <tr
                      key={p.isin}
                      style={{
                        background: isCurrent
                          ? "color-mix(in oklab, var(--primary) 12%, transparent)"
                          : undefined,
                        borderLeft: isCurrent
                          ? "3px solid var(--primary)"
                          : "3px solid transparent",
                        animationDelay: `${Math.min(i, 10) * 30}ms`,
                      }}
                      className={`animate-[singest-stagger_0.3s_ease-out_both] border-b border-border/40 transition-colors hover:bg-accent/40 ${
                        isCurrent ? "" : "even:bg-muted/35 odd:bg-card/35"
                      }`}
                    >
                      {cols.map((c) => (
                        <td
                          key={String(c.key)}
                          className={`whitespace-nowrap px-4 py-3 tabular-nums ${
                            c.align === "right" ? "text-right" : "text-left"
                          }`}
                        >
                          {c.render(p, i, isCurrent)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
