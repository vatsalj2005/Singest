"use client";

import {
  Activity,
  LineChart as LineChartIcon,
  TrendingUp,
  TrendingDown,
  Gauge,
} from "lucide-react";
import { num, fmtPrice, fmtN } from "@/lib/format";

type Row = Record<string, string | number | null>;

export function TechnicalIndicators({ stock }: { stock: Row }) {
  const ltp = num(stock.ltp);
  const sma50 = num(stock.day_sma_50_current_candle);
  const sma200 = num(stock.day_sma_200_current_candle);
  const rsi = num(stock.day_rsi_14_current_candle);

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">⚙️ Technical Indicators</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <RsiGauge value={rsi} />
        <SmaCard label="SMA 50" sma={sma50} ltp={ltp} />
        <SmaCard label="SMA 200" sma={sma200} ltp={ltp} />
        <IndicatorCard
          label="Bollinger Width"
          value={fmtN(stock.day_bb_upper_sub_bb_lower)}
          icon={Activity}
        />
        <IndicatorCard
          label="ATR (14) × 2"
          value={fmtN(stock.day_atr_14_current_candle_mul_2)}
          icon={LineChartIcon}
        />
      </div>
    </section>
  );
}

function IndicatorCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground/70" />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SmaCard({ label, sma, ltp }: { label: string; sma: number | null; ltp: number | null }) {
  const above = sma != null && ltp != null && ltp > sma;
  const below = sma != null && ltp != null && ltp < sma;
  const tone = above ? "text-emerald-400" : below ? "text-rose-400" : "text-muted-foreground";
  const msg =
    sma == null || ltp == null ? "—" : above ? `Price above ${label}` : `Price below ${label}`;
  const Icon = above ? TrendingUp : TrendingDown;
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{fmtPrice(sma)}</div>
      <div className={`mt-1 text-xs font-medium ${tone}`}>{msg}</div>
    </div>
  );
}

function RsiGauge({ value }: { value: number | null }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  // Semicircle: 180deg -> 0deg corresponds to value 0 -> 100
  const angle = 180 - (v / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const cx = 80;
  const cy = 80;
  const r = 60;
  const x = Number((cx + r * Math.cos(rad)).toFixed(4));
  const y = Number((cy - r * Math.sin(rad)).toFixed(4));

  const zone = value == null ? "—" : v < 30 ? "Oversold" : v > 70 ? "Overbought" : "Neutral";
  const zoneColor =
    value == null
      ? "text-muted-foreground"
      : v < 30
        ? "text-emerald-400"
        : v > 70
          ? "text-rose-400"
          : "text-muted-foreground";

  // Arc paths for color zones
  const arc = (from: number, to: number) => {
    const a1 = ((180 - (from / 100) * 180) * Math.PI) / 180;
    const a2 = ((180 - (to / 100) * 180) * Math.PI) / 180;
    const x1 = (cx + r * Math.cos(a1)).toFixed(4);
    const y1 = (cy - r * Math.sin(a1)).toFixed(4);
    const x2 = (cx + r * Math.cos(a2)).toFixed(4);
    const y2 = (cy - r * Math.sin(a2)).toFixed(4);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">RSI (14)</span>
        <Gauge className="h-4 w-4 text-muted-foreground/70" />
      </div>
      <div className="mt-2 flex justify-center">
        <svg width="160" height="100" viewBox="0 0 160 100">
          <path
            d={arc(0, 30)}
            stroke="rgb(52,211,153)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <path d={arc(30, 70)} stroke="rgba(148,163,184,0.4)" strokeWidth="10" fill="none" />
          <path
            d={arc(70, 100)}
            stroke="rgb(244,63,94)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          {value != null && (
            <>
              <line
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="var(--foreground)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx={cx} cy={cy} r="4" fill="var(--foreground)" />
            </>
          )}
        </svg>
      </div>
      <div className="text-center">
        <div className="text-2xl font-semibold tabular-nums">
          {value == null ? "—" : v.toFixed(1)}
        </div>
        <div className={`text-xs font-medium ${zoneColor}`}>{zone}</div>
      </div>
    </div>
  );
}
