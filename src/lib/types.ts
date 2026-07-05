/**
 * Shared type definitions for data flowing between the API and UI.
 *
 * These are the canonical shapes — any per-component type that overlaps
 * with these should import from here to prevent drift.
 */

// ---------------------------------------------------------------------------
// Stock data (from custom_scan table)
// ---------------------------------------------------------------------------

/** Minimal stock fields used in search results, popular stocks, movers. */
export type StockSummary = {
  isin: string;
  sym: string;
  disp_sym: string;
  ltp: number | null;
  pperchange: number | null;
  mcapclass: string | null;
};

/** Extended stock fields used in the screener table. */
export type ScreenerRow = StockSummary & {
  mcap: number | null;
  pe: number | null;
  pb: number | null;
  div_yeild: number | null;
  roce: number | null;
  roe: number | null;
  eps: number | null;
  net_profit_margin: number | null;
  price_perchng_1year: number | null;
  volume: number | null;
};

/** Peer comparison row — same fields as ScreenerRow. */
export type PeerRow = ScreenerRow;

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

/** Full news article as returned by the /api/news endpoint. */
export type NewsArticle = {
  article_id: number;
  title: string;
  text: string | null;
  overall_sentiment: string | null;
  category: string | null;
  sub_category: string | null;
  publish_date: string;
  stock_name: string | null;
  isin_code: string | null;
  display_symbol: string | null;
};

/** Lightweight news headline used on the stock detail page. */
export type NewsHeadline = {
  article_id: number | string;
  title: string;
  publish_date: string | null;
  overall_sentiment: string | null;
  category: string | null;
  sub_category: string | null;
};

// ---------------------------------------------------------------------------
// Corporate actions
// ---------------------------------------------------------------------------

export const CORPORATE_ACTION_TABS = [
  { key: "dividends", label: "Dividends" },
  { key: "bonus", label: "Bonus" },
  { key: "splits", label: "Splits" },
  { key: "rights", label: "Rights" },
  { key: "buybacks", label: "Buybacks" },
  { key: "quarterly-results", label: "Quarterly Results" },
] as const;

export type CorporateActionTabKey = (typeof CORPORATE_ACTION_TABS)[number]["key"];
