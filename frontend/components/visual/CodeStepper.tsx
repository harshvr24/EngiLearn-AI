"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CodeStepsData } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function CodeStepper({ data }: { data: CodeStepsData }) {
  const [current, setCurrent] = useState(0);
  const { steps } = data;
  const step = steps[current];
  if (!step) return null;

  const varEntries = Object.entries(step.variables);

  // Build all pseudocode lines for context
  const allLines = steps.map((s) => s.pseudocode_line);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-serif text-base font-semibold text-foreground">{data.title}</p>
          <p className="text-xs text-muted-foreground">
            Step {step.step_num} of {steps.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={current === 0}
            onClick={() => setCurrent((c) => c - 1)}
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={current === steps.length - 1}
            onClick={() => setCurrent((c) => c + 1)}
            aria-label="Next step"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-200"
          style={{ width: `${((current + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pseudocode panel */}
        <div className="overflow-hidden rounded-lg border border-border bg-[#0f172a]">
          <div className="border-b border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground">
            Pseudocode
          </div>
          <div className="p-3">
            {allLines.map((line, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded px-2 py-1 font-mono text-xs leading-relaxed transition-colors ${
                  i === current
                    ? "bg-primary/20 text-primary"
                    : "text-slate-400"
                }`}
              >
                <span className="shrink-0 w-5 text-right text-slate-600">{i + 1}</span>
                <span className="whitespace-pre">{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: description + variables */}
        <div className="flex flex-col gap-3">
          {/* Description */}
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Explanation
            </p>
            <p className="text-sm text-foreground leading-relaxed">{step.description}</p>
          </div>

          {/* Variable state */}
          {varEntries.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Variable State
              </p>
              <div className="flex flex-wrap gap-2">
                {varEntries.map(([k, v]) => (
                  <div
                    key={k}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs"
                  >
                    <span className="font-semibold text-primary">{k}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="text-foreground">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">No variables tracked at this step.</p>
            </div>
          )}
        </div>
      </div>

      {/* Step navigation dots */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {steps.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current
                ? "w-6 bg-primary"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
            }`}
            aria-label={`Go to step ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
