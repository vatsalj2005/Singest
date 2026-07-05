/**
 * Shared number formatting utilities used across the Singest UI.
 *
 * Centralised here to avoid drift between the dashboard, screener,
 * stock-detail, peer-comparison, and corporate-actions views which
 * all need identical formatting for prices, percentages, and dates.
 */

// ---------------------------------------------------------------------------
// Primitive coercion
// ---------------------------------------------------------------------------

/** Coerce an unknown DB value to a number, returning null for anything non-numeric. */
export const num = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
};

// ---------------------------------------------------------------------------
// Price / currency
// ---------------------------------------------------------------------------

/** Format as Indian Rupee price: ₹1,23,456.78 */
export const fmtPrice = (v: unknown): string => {
  const n = num(v);
  return n == null
    ? "—"
    : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
};

/** Format as Crore value: ₹1,234 Cr. */
export const fmtCr = (v: unknown): string => {
  const n = num(v);
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

// ---------------------------------------------------------------------------
// Percentages
// ---------------------------------------------------------------------------

/** Format as signed percentage: +12.34% */
export const fmtPct = (v: unknown): string => {
  const n = num(v);
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
};

// ---------------------------------------------------------------------------
// General numbers
// ---------------------------------------------------------------------------

/** Format a number with configurable decimal places (default 2). */
export const fmtN = (v: unknown, d = 2): string => {
  const n = num(v);
  return n == null
    ? "—"
    : n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
};

/** Format as integer with locale grouping. */
export const fmtInt = (v: unknown): string => {
  const n = num(v);
  return n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

// ---------------------------------------------------------------------------
// CSS class helpers
// ---------------------------------------------------------------------------

/** Return a Tailwind text-color class based on positive/negative/null value. */
export const pctCls = (v: unknown): string => {
  const n = num(v);
  if (n == null) return "text-muted-foreground";
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-rose-400";
  return "text-muted-foreground";
};

/** Return badge classes for a market-cap classification string. */
export function mcapBadge(c: string | null | undefined): string {
  if (!c) return "bg-muted/60 text-muted-foreground border-border";
  const k = c.toLowerCase();
  if (k.includes("large")) return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  if (k.includes("mid")) return "bg-violet-500/15 text-violet-300 border-violet-500/30";
  if (k.includes("micro")) return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (k.includes("small")) return "bg-teal-500/15 text-teal-300 border-teal-500/30";
  return "bg-muted/60 text-muted-foreground border-border";
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/** Relative time label: "3m ago", "2h ago", etc. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Math.max(0, Date.now() - d) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
