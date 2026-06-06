"use client";

import { useRef, useState } from "react";
import type { TimelineData, TimelineEvent } from "@/lib/types";

const IMPORTANCE_RADIUS = [10, 15, 22];
const IMPORTANCE_COLOR = ["#64748b", "#0ea5e9", "#6366f1"];
const IMPORTANCE_STROKE_W = [1.5, 2, 2.5];

const NODE_SPACING = 140;
const TRACK_Y = 120;
const SVG_HEIGHT = 260;

interface TooltipState { event: TimelineEvent; x: number; y: number }

export function Timeline({ data }: { data: TimelineData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const { events } = data;
  const totalWidth = Math.max(800, events.length * NODE_SPACING + 120);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card">
      {/* Title */}
      <div className="border-b border-border px-4 py-3">
        <p className="font-serif text-base font-semibold text-foreground">{data.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {events.length} events · scroll horizontally to explore
        </p>
      </div>

      {/* Scrollable SVG */}
      <div ref={containerRef} className="overflow-x-auto">
        <svg
          width={totalWidth}
          height={SVG_HEIGHT}
          className="block"
          aria-label="Timeline diagram"
        >
          {/* Horizontal track */}
          <line
            x1={60}
            y1={TRACK_Y}
            x2={totalWidth - 60}
            y2={TRACK_Y}
            stroke="#334155"
            strokeWidth="2"
          />

          {events.map((ev, i) => {
            const x = 60 + i * NODE_SPACING + NODE_SPACING / 2;
            const imp = Math.max(1, Math.min(3, ev.importance)) - 1;
            const r = IMPORTANCE_RADIUS[imp];
            const color = IMPORTANCE_COLOR[imp];
            const sw = IMPORTANCE_STROKE_W[imp];
            const above = i % 2 === 0;
            const labelY = above ? TRACK_Y - r - 40 : TRACK_Y + r + 40;
            const yearY = above ? TRACK_Y + r + 18 : TRACK_Y - r - 8;

            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setTooltip({ event: ev, x, y: TRACK_Y })}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Connector */}
                <line
                  x1={x} y1={above ? TRACK_Y - r : TRACK_Y + r}
                  x2={x} y2={above ? TRACK_Y - r - 30 : TRACK_Y + r + 30}
                  stroke={color} strokeWidth="1" strokeOpacity="0.5"
                />
                {/* Node circle */}
                <circle
                  cx={x} cy={TRACK_Y} r={r}
                  fill={color} fillOpacity="0.15"
                  stroke={color} strokeWidth={sw}
                />
                {/* Importance dot */}
                <circle cx={x} cy={TRACK_Y} r={3} fill={color} />

                {/* Year label */}
                <text
                  x={x} y={yearY}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill={color}
                  fontFamily="inherit"
                >
                  {ev.year}
                </text>

                {/* Event title (truncated) */}
                <text
                  x={x} y={labelY}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="500"
                  fill="#cbd5e1"
                  fontFamily="inherit"
                >
                  {ev.title.length > 20 ? ev.title.slice(0, 18) + "…" : ev.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-xl border border-border bg-popover p-3 shadow-lg"
          style={{ left: Math.min(tooltip.x - 10, 600), top: 90, transform: "translateY(-100%)" }}
        >
          <p className="text-xs font-semibold text-primary">{tooltip.event.year}</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{tooltip.event.title}</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {tooltip.event.description}
          </p>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: tooltip.event.importance }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-primary" />
            ))}
            <span className="ml-1 text-xs text-muted-foreground">
              {tooltip.event.importance === 3
                ? "Major breakthrough"
                : tooltip.event.importance === 2
                  ? "Significant"
                  : "Minor milestone"}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 border-t border-border px-4 py-2">
        {[["Minor milestone", 0], ["Significant", 1], ["Major breakthrough", 2]].map(
          ([label, imp]) => (
            <div key={imp as number} className="flex items-center gap-1.5">
              <span
                className="inline-block rounded-full border"
                style={{
                  width: IMPORTANCE_RADIUS[imp as number] * 1.2,
                  height: IMPORTANCE_RADIUS[imp as number] * 1.2,
                  borderColor: IMPORTANCE_COLOR[imp as number],
                  background: IMPORTANCE_COLOR[imp as number] + "26",
                }}
              />
              <span className="text-xs text-muted-foreground">{label as string}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
