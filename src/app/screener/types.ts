import type { ScreenerRow } from "@/lib/types";

export type Filters = {
  mcapclass: string[];
  pe_min: string;
  pe_max: string;
  roce_min: string;
  roe_min: string;
  div_yield_min: string;
};

export const EMPTY: Filters = {
  mcapclass: [],
  pe_min: "",
  pe_max: "",
  roce_min: "",
  roe_min: "",
  div_yield_min: "",
};

export const COLS: {
  key: keyof ScreenerRow;
  header: string;
  sortable: boolean;
  align?: "right";
}[] = [
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
