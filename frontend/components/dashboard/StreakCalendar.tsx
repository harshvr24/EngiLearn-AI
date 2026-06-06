"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";

import type { StreakData } from "@/lib/types";

interface Props {
  streak: StreakData;
}

const WEEKS = 20;
const DAY_SIZE = 12;
const DAY_GAP = 3;
const CELL = DAY_SIZE + DAY_GAP;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function isoToday(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

export function StreakCalendar({ streak }: Props) {
  const studySet = useMemo(() => new Set(streak.history), [streak.history]);

  // Build a grid: WEEKS columns × 7 rows, ending today
  const grid = useMemo(() => {
    const today = new Date();
    // Start from the Sunday of (WEEKS * 7) days ago
    const totalDays = WEEKS * 7;
    const startOffset = today.getDay(); // 0=Sun
    const startDate = addDays(today, -(totalDays - 1 + startOffset));

    const cols: { iso: string; date: Date }[][] = [];
    let col: { iso: string; date: Date }[] = [];

    for (let i = 0; i < totalDays + startOffset; i++) {
      const d = addDays(startDate, i);
      const iso = d.toISOString().split("T")[0];
      col.push({ iso, date: d });
      if (col.length === 7) {
        cols.push(col);
        col = [];
      }
    }
    if (col.length > 0) cols.push(col);
    return cols;
  }, []);

  // Month labels: find where each month starts in the column grid
  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    grid.forEach((col, ci) => {
      const firstDay = col[0];
      if (firstDay) {
        const m = firstDay.date.getMonth();
        if (m !== lastMonth) {
          labels.push({ col: ci, label: MONTHS[m] ?? "" });
          lastMonth = m;
        }
      }
    });
    return labels;
  }, [grid]);

  const svgWidth = grid.length * CELL;
  const svgHeight = 7 * CELL + 20; // +20 for month labels at top

  return (
    <div className="flex flex-col gap-4">
      {/* Streak stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {streak.current}
            </p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">
            {streak.longest}
          </p>
          <p className="text-xs text-muted-foreground">best streak</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">
            {streak.history.length}
          </p>
          <p className="text-xs text-muted-foreground">days studied</p>
        </div>
      </div>

      {/* Calendar heatmap */}
      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="block"
          aria-label="Study activity calendar"
        >
          {/* Month labels */}
          {monthLabels.map(({ col, label }) => (
            <text
              key={`m-${col}`}
              x={col * CELL}
              y={11}
              fontSize={10}
              className="fill-muted-foreground"
              fontFamily="inherit"
            >
              {label}
            </text>
          ))}

          {/* Day cells */}
          {grid.map((col, ci) =>
            col.map(({ iso, date }, ri) => {
              const active = studySet.has(iso);
              const isToday = iso === isoToday();
              return (
                <rect
                  key={iso}
                  x={ci * CELL}
                  y={20 + ri * CELL}
                  width={DAY_SIZE}
                  height={DAY_SIZE}
                  rx={2}
                  className={
                    active
                      ? "fill-primary opacity-80"
                      : "fill-muted opacity-60"
                  }
                  stroke={isToday ? "hsl(var(--primary))" : "none"}
                  strokeWidth={isToday ? 1.5 : 0}
                >
                  <title>
                    {date.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {active ? " · studied" : ""}
                  </title>
                </rect>
              );
            }),
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        {[0.15, 0.4, 0.65, 0.85].map((opacity) => (
          <div
            key={opacity}
            className="h-3 w-3 rounded-sm bg-primary"
            style={{ opacity }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
