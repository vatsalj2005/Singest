"use client";

import { num } from "@/lib/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";

type Row = Record<string, string | number | null>;

export function PricePerformance({ stock }: { stock: Row }) {
  const perf = [
    { period: "1W", value: num(stock.price_perchng_1week) },
    { period: "2W", value: num(stock.price_perchng_2week) },
    { period: "1M", value: num(stock.price_perchng_1mon) },
    { period: "3M", value: num(stock.price_perchng_3mon) },
    { period: "1Y", value: num(stock.price_perchng_1year) },
    { period: "3Y", value: num(stock.price_perchng_3year) },
    { period: "5Y", value: num(stock.price_perchng_5year) },
  ].map((p) => ({ ...p, value: p.value ?? 0 }));

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">📈 Price Performance</h2>
      <div className="glass-card rounded-xl p-5">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={perf} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

              <XAxis
                dataKey="period"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
              />

              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickFormatter={(v) => `${v}%`}
                width={45}
              />

              <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />

              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                itemStyle={{ color: "var(--foreground)" }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(v: number) => [`${v.toFixed(2)}%`, "Change"]}
              />

              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                activeDot={{ r: 6 }}
                animationDuration={900}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  fill="var(--foreground)"
                  fontSize={11}
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
