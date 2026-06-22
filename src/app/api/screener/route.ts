import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db.server";

export const dynamic = "force-dynamic";

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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sp = url.searchParams;

    const where: string[] = [];
    const args: unknown[] = [];
    const push = (clause: string, val: unknown) => {
      args.push(val);
      where.push(clause.replace("?", `$${args.length}`));
    };

    const mcapclass = sp.get("mcapclass");
    if (mcapclass) {
      const list = mcapclass
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length) {
        args.push(list);
        where.push(`mcapclass = ANY($${args.length})`);
      }
    }
    const peMin = sp.get("pe_min");
    const peMax = sp.get("pe_max");
    if (peMin) push(`pe >= ?`, Number(peMin));
    if (peMax) push(`pe <= ?`, Number(peMax));
    const roceMin = sp.get("roce_min");
    if (roceMin) push(`roce >= ?`, Number(roceMin));
    const roeMin = sp.get("roe_min");
    if (roeMin) push(`roe >= ?`, Number(roeMin));
    const dyMin = sp.get("div_yield_min");
    if (dyMin) push(`div_yeild >= ?`, Number(dyMin));

    const sortRaw = sp.get("sort") ?? "mcap";
    const sort = SORTABLE.has(sortRaw) ? sortRaw : "mcap";
    const order = (sp.get("order") ?? "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "50") || 50));
    const offset = (page - 1) * limit;

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRows = await query<{ c: string | number }>(
      `SELECT COUNT(*)::int AS c FROM custom_scan ${whereSql}`,
      args,
    );
    const total = Number(countRows[0]?.c ?? 0);

    const cols = `isin, sym, disp_sym, ltp, pperchange, mcap, mcapclass, pe, pb, div_yeild, roce, roe, eps, net_profit_margin, price_perchng_1year, volume`;
    const rows = await query<Record<string, unknown>>(
      `SELECT ${cols} FROM custom_scan ${whereSql} ORDER BY ${sort} ${order} NULLS LAST LIMIT ${limit} OFFSET ${offset}`,
      args,
    );

    return NextResponse.json(
      { rows, total, page, limit },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch screener results:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
