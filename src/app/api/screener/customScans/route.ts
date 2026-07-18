import { NextRequest, NextResponse } from "next/server";
import { getScreenerResults, type ScreenerFilters } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sp = url.searchParams;

    const filters: ScreenerFilters = {};

    const mcapclass = sp.get("mcapclass");
    if (mcapclass) {
      const list = mcapclass
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length) filters.mcapclass = list;
    }

    const peMin = sp.get("pe_min");
    const peMax = sp.get("pe_max");
    if (peMin) filters.peMin = Number(peMin);
    if (peMax) filters.peMax = Number(peMax);

    const roceMin = sp.get("roce_min");
    if (roceMin) filters.roceMin = Number(roceMin);

    const roeMin = sp.get("roe_min");
    if (roeMin) filters.roeMin = Number(roeMin);

    const dyMin = sp.get("div_yield_min");
    if (dyMin) filters.divYieldMin = Number(dyMin);

    filters.sort = sp.get("sort") ?? "mcap";
    filters.order = (sp.get("order") ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
    filters.page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
    filters.limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "50") || 50));

    const result = await getScreenerResults(filters);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Failed to fetch screener results:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
