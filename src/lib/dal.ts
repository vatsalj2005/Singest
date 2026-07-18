/**
 * Data Access Layer — every SQL query in the application lives here.
 *
 * If a table is renamed, a column changes, or a query needs updating,
 * this is the ONLY file you need to touch.
 */

import { query } from "./db.server";

// ---------------------------------------------------------------------------
// Table names — single source of truth
// ---------------------------------------------------------------------------

const T = {
  CUSTOM_SCAN: "custom_scan",
  LIVE_NEWS: "live_news",
  CA_DIVIDENDS: "corporate_actions_dividends",
  CA_BONUS: "corporate_actions_bonus",
  CA_SPLITS: "corporate_actions_splits",
  CA_RIGHTS: "corporate_actions_rights",
  CA_BUYBACKS: "corporate_actions_buybacks",
  CA_QUARTERLY_RESULTS: "corporate_actions_quarterly_results",
} as const;

/** Maps a corporate-action URL key to its database table name. */
export const CORPORATE_ACTION_TABLES: Record<string, string> = {
  dividends: T.CA_DIVIDENDS,
  bonus: T.CA_BONUS,
  splits: T.CA_SPLITS,
  rights: T.CA_RIGHTS,
  buybacks: T.CA_BUYBACKS,
  "quarterly-results": T.CA_QUARTERLY_RESULTS,
};

// ---------------------------------------------------------------------------
// Reusable column lists
// ---------------------------------------------------------------------------

const STOCK_SUMMARY_COLS = "isin, sym, disp_sym, ltp, pperchange, mcapclass";

const SCREENER_COLS =
  "isin, sym, disp_sym, ltp, pperchange, mcap, mcapclass, pe, pb, div_yeild, roce, roe, eps, net_profit_margin, price_perchng_1year, volume";

const PEER_COLS =
  "isin, sym, disp_sym, ltp, pperchange, mcap, pe, div_yeild, roce, roe, eps, pb, net_profit_margin, volume";

const NEWS_FULL_COLS =
  "article_id, title, text, overall_sentiment, category, sub_category, publish_date, stock_name, isin_code, display_symbol, article_slug";

const NEWS_HEADLINE_COLS =
  "article_id, title, overall_sentiment, category, sub_category, publish_date";

const CORPORATE_ACTION_COLS =
  "row_hash, isin, sym, disp_sym, exch, inst, seg, seosym, ltp, volume, pchange, pperchange, act_type, ann_date, ann_ltp, div_type, ex_date, note, rec_date, rmk, fetched_at";

// ---------------------------------------------------------------------------
// custom_scan queries
// ---------------------------------------------------------------------------

/** Full stock row by ISIN (used on the stock detail page). */
export async function getStockByIsin(isin: string) {
  const rows = await query<Record<string, string | number | null>>(
    `SELECT * FROM ${T.CUSTOM_SCAN} WHERE isin = $1 LIMIT 1`,
    [isin],
  );
  return rows[0] ?? null;
}

/** Total number of rows in custom_scan. */
export async function getCustomScanCount(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${T.CUSTOM_SCAN}`,
  );
  return Number(rows[0]?.count ?? 0);
}

/** Top gainer by percentage change. */
export async function getTopGainer() {
  const rows = await query<Record<string, unknown>>(
    `SELECT ${STOCK_SUMMARY_COLS}
     FROM ${T.CUSTOM_SCAN}
     WHERE pperchange IS NOT NULL
     ORDER BY pperchange DESC NULLS LAST LIMIT 1`,
  );
  return rows[0] ?? null;
}

/** Top loser by percentage change. */
export async function getTopLoser() {
  const rows = await query<Record<string, unknown>>(
    `SELECT ${STOCK_SUMMARY_COLS}
     FROM ${T.CUSTOM_SCAN}
     WHERE pperchange IS NOT NULL
     ORDER BY pperchange ASC NULLS LAST LIMIT 1`,
  );
  return rows[0] ?? null;
}

/** Top 10 stocks by market cap. */
export async function getPopularStocks() {
  return query<Record<string, unknown>>(
    `SELECT ${STOCK_SUMMARY_COLS}
     FROM ${T.CUSTOM_SCAN}
     ORDER BY mcap DESC NULLS LAST LIMIT 10`,
  );
}

/** Search stocks by symbol (ILIKE match). */
export async function searchStocks(q: string) {
  const like = `%${q}%`;
  return query<Record<string, unknown>>(
    `SELECT ${STOCK_SUMMARY_COLS}
     FROM ${T.CUSTOM_SCAN}
     WHERE disp_sym ILIKE $1 OR sym ILIKE $1
     ORDER BY
       CASE WHEN sym ILIKE $2 THEN 0
            WHEN disp_sym ILIKE $2 THEN 1
            ELSE 2 END,
       mcap DESC NULLS LAST
     LIMIT 10`,
    [like, `${q}%`],
  );
}

/** Look up the mcapclass for a given ISIN. */
export async function getMcapclassByIsin(isin: string) {
  const rows = await query<{ mcapclass: string | null }>(
    `SELECT mcapclass FROM ${T.CUSTOM_SCAN} WHERE isin = $1 LIMIT 1`,
    [isin],
  );
  return rows[0] ?? null;
}

/** Peer stocks in the same mcapclass (top 10 by market cap). */
export async function getPeerStocks(mcapclass: string) {
  return query<Record<string, unknown>>(
    `SELECT ${PEER_COLS} FROM ${T.CUSTOM_SCAN}
     WHERE mcapclass = $1
     ORDER BY mcap DESC NULLS LAST LIMIT 10`,
    [mcapclass],
  );
}

/** Single stock with peer-comparison columns. */
export async function getStockWithPeerCols(isin: string) {
  const rows = await query<Record<string, unknown>>(
    `SELECT ${PEER_COLS} FROM ${T.CUSTOM_SCAN} WHERE isin = $1 LIMIT 1`,
    [isin],
  );
  return rows[0] ?? null;
}

// --- Screener ---------------------------------------------------------------

const SORTABLE = new Set([
  "mcap",
  "ltp",
  "pperchange",
  "pe",
  "pb",
  "div_yeild",
  "roce",
  "roe",
  "eps",
  "net_profit_margin",
  "price_perchng_1year",
  "volume",
]);

export type ScreenerFilters = {
  mcapclass?: string[];
  peMin?: number;
  peMax?: number;
  roceMin?: number;
  roeMin?: number;
  divYieldMin?: number;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
};

/** Paginated, filtered screener results together with the total count. */
export async function getScreenerResults(filters: ScreenerFilters) {
  const where: string[] = [];
  const args: unknown[] = [];
  const push = (clause: string, val: unknown) => {
    args.push(val);
    where.push(clause.replace("?", `$${args.length}`));
  };

  if (filters.mcapclass?.length) {
    args.push(filters.mcapclass);
    where.push(`mcapclass = ANY($${args.length})`);
  }
  if (filters.peMin != null) push(`pe >= ?`, filters.peMin);
  if (filters.peMax != null) push(`pe <= ?`, filters.peMax);
  if (filters.roceMin != null) push(`roce >= ?`, filters.roceMin);
  if (filters.roeMin != null) push(`roe >= ?`, filters.roeMin);
  if (filters.divYieldMin != null) push(`div_yeild >= ?`, filters.divYieldMin);

  const sortRaw = filters.sort ?? "mcap";
  const sort = SORTABLE.has(sortRaw) ? sortRaw : "mcap";
  const order = filters.order === "asc" ? "ASC" : "DESC";

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(200, Math.max(1, filters.limit ?? 50));
  const offset = (page - 1) * limit;

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRows = await query<{ c: string | number }>(
    `SELECT COUNT(*)::int AS c FROM ${T.CUSTOM_SCAN} ${whereSql}`,
    args,
  );
  const total = Number(countRows[0]?.c ?? 0);

  const rows = await query<Record<string, unknown>>(
    `SELECT ${SCREENER_COLS} FROM ${T.CUSTOM_SCAN} ${whereSql} ORDER BY ${sort} ${order} NULLS LAST LIMIT ${limit} OFFSET ${offset}`,
    args,
  );

  return { rows, total, page, limit };
}

/** Distinct mcapclass values and total stock count (screener filter facets). */
export async function getScreenerFacets() {
  const classes = await query<{ mcapclass: string | null }>(
    `SELECT DISTINCT mcapclass FROM ${T.CUSTOM_SCAN}
     WHERE mcapclass IS NOT NULL
     ORDER BY mcapclass`,
  );
  const totalRows = await query<{ c: string | number }>(
    `SELECT COUNT(*)::int AS c FROM ${T.CUSTOM_SCAN}`,
  );

  return {
    mcapclasses: classes.map((r) => r.mcapclass).filter(Boolean) as string[],
    total: Number(totalRows[0]?.c ?? 0),
  };
}

// ---------------------------------------------------------------------------
// live_news queries
// ---------------------------------------------------------------------------

/** Latest news articles (global feed). */
export async function getLatestNews(limit: number) {
  return query<Record<string, unknown>>(
    `SELECT ${NEWS_FULL_COLS}
     FROM ${T.LIVE_NEWS}
     WHERE publish_date IS NOT NULL
     ORDER BY publish_date DESC
     LIMIT $1`,
    [limit],
  );
}

/** News headlines for a specific stock by ISIN. */
export async function getNewsByIsin(isin: string) {
  return query<Record<string, unknown>>(
    `SELECT ${NEWS_HEADLINE_COLS}
     FROM ${T.LIVE_NEWS}
     WHERE isin_code = $1
     ORDER BY publish_date DESC NULLS LAST
     LIMIT 10`,
    [isin],
  );
}

// ---------------------------------------------------------------------------
// corporate_actions queries
// ---------------------------------------------------------------------------

/**
 * Rows for a specific corporate action type.
 * Returns `null` if the action key is unknown.
 */
export async function getCorporateActionRows(actionKey: string, isin: string) {
  const table = CORPORATE_ACTION_TABLES[actionKey];
  if (!table) return null;

  return query<Record<string, unknown>>(
    `SELECT ${CORPORATE_ACTION_COLS}
     FROM ${table}
     WHERE isin = $1
     ORDER BY ex_date DESC NULLS LAST`,
    [isin],
  );
}

/** Row counts across all corporate action tables for a given ISIN. */
export async function getCorporateActionCounts(isin: string) {
  const entries = await Promise.all(
    Object.entries(CORPORATE_ACTION_TABLES).map(async ([key, table]) => {
      const rows = await query<{ c: string | number }>(
        `SELECT COUNT(*)::int AS c FROM ${table} WHERE isin = $1`,
        [isin],
      );
      return [key, Number(rows[0]?.c ?? 0)] as const;
    }),
  );
  return Object.fromEntries(entries);
}
