"use client";

import { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { NewsHeadline } from "@/lib/types";

type Row = Record<string, string | number | null>;

function sentimentColor(s: string | null) {
  if (!s) return "bg-muted/60 text-muted-foreground";
  const k = s.toLowerCase();
  if (k.includes("positive") || k.includes("bull"))
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (k.includes("negative") || k.includes("bear"))
    return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  return "bg-amber-500/15 text-amber-300 border-amber-500/30";
}

export function LatestNews({ stock, isin }: { stock: Row; isin: string }) {
  const [news, setNews] = useState<NewsHeadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/stock/${isin}/liveNews`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setNews(data?.news ?? []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isin]);

  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Newspaper className="h-5 w-5" />
        Latest News for {(stock.disp_sym as string) ?? (stock.sym as string)}
      </h2>
      {loading ? (
        <div className="glass rounded-xl p-6 text-sm text-muted-foreground">
          Loading news headlines...
        </div>
      ) : news.length === 0 ? (
        <div className="glass rounded-xl p-6 text-sm text-muted-foreground">
          No recent news available for this stock.
        </div>
      ) : (
        <div className="grid gap-3">
          {news.map((n, i) => (
            <div
              key={String(n.article_id)}
              className="stagger glass-card rounded-xl p-4"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {n.overall_sentiment && (
                  <span
                    className={`rounded-md border px-2 py-0.5 capitalize ${sentimentColor(
                      n.overall_sentiment,
                    )}`}
                  >
                    {n.overall_sentiment}
                  </span>
                )}
                {n.category && (
                  <span className="rounded-md bg-muted/60 px-2 py-0.5 text-muted-foreground">
                    {n.category}
                  </span>
                )}
                <span className="text-muted-foreground">{timeAgo(n.publish_date)}</span>
              </div>
              <div className="mt-2 text-sm font-medium leading-snug">{n.title}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
