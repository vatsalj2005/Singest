"use client";

import Link from "next/link";
import { useState } from "react";
import { Newspaper, ArrowUpRight } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { NewsArticle } from "@/lib/types";

export function News({ news, loading }: { news: NewsArticle[] | null; loading: boolean }) {
  const [limit, setLimit] = useState(5);

  const visibleNews = news ? news.slice(0, limit) : [];
  const hasMore = news && news.length > limit;

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold tracking-tight">Latest news</h2>
      </div>
      <div className="grid gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-white/[0.04]"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))
        ) : (
          <>
            {visibleNews.map((n) => (
              <NewsCard key={n.article_id} item={n} />
            ))}
            {news && news.length === 0 && (
              <div className="text-sm text-muted-foreground">No news yet.</div>
            )}
            {hasMore && (
              <button
                onClick={() => setLimit((prev) => prev + 5)}
                className="mt-2 w-full rounded-xl border border-border bg-white/[0.02] py-4 text-center text-sm font-medium transition-colors hover:bg-white/[0.05] hover:border-primary/50 text-muted-foreground hover:text-foreground"
              >
                View More News
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function NewsCard({ item }: { item: NewsArticle }) {
  const sentiment = (item.overall_sentiment ?? "").toLowerCase();
  const sentColor =
    sentiment === "positive"
      ? "text-emerald-400 bg-emerald-400/10"
      : sentiment === "negative"
        ? "text-rose-400 bg-rose-400/10"
        : "text-muted-foreground bg-muted/40";
  return (
    <article className="glass rounded-xl p-5 transition-colors hover:bg-card/80">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {item.category && (
          <span className="rounded-md bg-muted/60 px-2 py-0.5">{item.category}</span>
        )}
        {item.overall_sentiment && (
          <span className={`rounded-md px-2 py-0.5 capitalize ${sentColor}`}>
            {item.overall_sentiment}
          </span>
        )}
        <span>{timeAgo(item.publish_date)}</span>
        {item.display_symbol && item.isin_code && (
          <Link
            href={`/stock/${item.isin_code}`}
            className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
          >
            {item.display_symbol} <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <h3 className="mt-2 text-base font-medium leading-snug">{item.title}</h3>
      {item.text && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.text}</p>}
    </article>
  );
}
