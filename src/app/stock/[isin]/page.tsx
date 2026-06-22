import { notFound } from "next/navigation";
import { query } from "@/lib/db.server";
import { StockPageClient } from "./StockPageClient";
import type { Metadata } from "next";

type Row = Record<string, string | number | null>;

async function getStockData(isin: string) {
  try {
    const rows = await query<Row>(`SELECT * FROM custom_scan WHERE isin = $1 LIMIT 1`, [isin]);
    if (!rows[0]) return null;

    const news = await query<{
      article_id: number | string;
      title: string;
      publish_date: string | null;
      overall_sentiment: string | null;
      category: string | null;
      sub_category: string | null;
    }>(
      `SELECT article_id, title, publish_date, overall_sentiment, category, sub_category
       FROM live_news
       WHERE isin_code = $1
       ORDER BY publish_date DESC NULLS LAST
       LIMIT 10`,
      [isin],
    );

    return { stock: rows[0], news };
  } catch (error) {
    console.error("Database query failed:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ isin: string }>;
}): Promise<Metadata> {
  const { isin } = await params;
  const result = await getStockData(isin);
  if (!result) {
    return {
      title: "Stock Not Found — Singest",
      description: "No stock matching this ISIN could be found.",
    };
  }
  const s = result.stock;
  const name = (s.disp_sym as string) ?? (s.sym as string) ?? "Stock";
  return {
    title: `${name} — Stock Analysis | Singest`,
    description: `Fundamentals, technicals, performance, and news for ${name}.`,
  };
}

export default async function StockPage({ params }: { params: Promise<{ isin: string }> }) {
  const { isin } = await params;
  const result = await getStockData(isin);

  if (!result) {
    notFound();
  }

  return <StockPageClient stock={result.stock} news={result.news} />;
}
