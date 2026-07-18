"use client";

import { useState, useEffect } from "react";
import { Filter, RotateCcw, Search as SearchIcon } from "lucide-react";
import { type Filters, EMPTY } from "./types";

type FilterProps = {
  facetsData: { mcapclasses: string[]; total: number } | null;
  facetsLoading: boolean;
  onApply: (filters: Filters) => void;
  onReset: () => void;
  appliedFilters: Filters;
};

export function FilterBar({
  facetsData,
  facetsLoading,
  onApply,
  onReset,
  appliedFilters,
}: FilterProps) {
  const [draft, setDraft] = useState<Filters>(appliedFilters);

  // Sync draft state if appliedFilters changes externally (like reset)
  useEffect(() => {
    setDraft(appliedFilters);
  }, [appliedFilters]);

  function toggleClass(c: string) {
    setDraft((d) =>
      d.mcapclass.includes(c)
        ? { ...d, mcapclass: d.mcapclass.filter((x) => x !== c) }
        : { ...d, mcapclass: [...d.mcapclass, c] },
    );
  }

  function handleReset() {
    setDraft(EMPTY);
    onReset();
  }

  function handleApply() {
    onApply(draft);
  }

  return (
    <section className="stagger glass-card mt-8 rounded-2xl p-5" style={{ animationDelay: "80ms" }}>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Filter className="h-4 w-4" />
        Filters
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Market Cap Class
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(facetsData?.mcapclasses ?? []).map((c) => {
              const active = draft.mcapclass.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleClass(c)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "border-primary/60 bg-primary/20 text-primary shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
                      : "border-border bg-white/[0.03] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
            {facetsLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
          </div>
        </div>

        <NumGroup
          label="P/E Range"
          className="lg:col-span-3"
          fields={[
            { ph: "Min", value: draft.pe_min, on: (v) => setDraft({ ...draft, pe_min: v }) },
            { ph: "Max", value: draft.pe_max, on: (v) => setDraft({ ...draft, pe_max: v }) },
          ]}
        />
        <NumGroup
          label="ROCE Min %"
          className="lg:col-span-1.5"
          fields={[
            { ph: "0", value: draft.roce_min, on: (v) => setDraft({ ...draft, roce_min: v }) },
          ]}
        />
        <NumGroup
          label="ROE Min %"
          className="lg:col-span-1.5"
          fields={[
            { ph: "0", value: draft.roe_min, on: (v) => setDraft({ ...draft, roe_min: v }) },
          ]}
        />
        <NumGroup
          label="Div Yield Min %"
          className="lg:col-span-2"
          fields={[
            {
              ph: "0",
              value: draft.div_yield_min,
              on: (v) => setDraft({ ...draft, div_yield_min: v }),
            },
          ]}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
        <button
          onClick={handleApply}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_45%,transparent)] transition-all hover:brightness-110"
        >
          <SearchIcon className="h-3.5 w-3.5" /> Apply Filters
        </button>
      </div>
    </section>
  );
}

type NumGroupProps = {
  label: string;
  className?: string;
  fields: { ph: string; value: string; on: (v: string) => void }[];
};

function NumGroup({ label, className, fields }: NumGroupProps) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-2">
        {fields.map((f, i) => (
          <input
            key={i}
            type="number"
            inputMode="decimal"
            value={f.value}
            placeholder={f.ph}
            onChange={(e) => f.on(e.target.value)}
            className="w-full rounded-md border border-border bg-white/[0.03] px-3 py-1.5 text-sm tabular-nums outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:bg-white/[0.06]"
          />
        ))}
      </div>
    </div>
  );
}
