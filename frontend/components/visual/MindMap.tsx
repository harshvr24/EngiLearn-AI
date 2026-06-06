"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MindmapData, MindmapEdge, MindmapNode } from "@/lib/types";

// ── Layout ────────────────────────────────────────────────────────────────────

interface NodePos extends MindmapNode {
  x: number;
  y: number;
}

interface EdgePath extends MindmapEdge {
  path: string;
}

const R1 = 200;  // root → branch
const R2 = 390;  // root → leaf

function computeLayout(data: MindmapData): { nodes: NodePos[]; edges: EdgePath[] } {
  const { nodes, edges } = data;

  const childMap = new Map<string, string[]>();
  for (const n of nodes) childMap.set(n.id, []);
  for (const e of edges) childMap.get(e.source)?.push(e.target);

  const root = nodes.find((n) => n.depth === 0);
  if (!root) return { nodes: [], edges: [] };

  const pos = new Map<string, { x: number; y: number }>();
  pos.set(root.id, { x: 0, y: 0 });

  const branches = childMap.get(root.id) ?? [];
  branches.forEach((branchId, bi) => {
    const angle = (bi / branches.length) * 2 * Math.PI - Math.PI / 2;
    pos.set(branchId, { x: R1 * Math.cos(angle), y: R1 * Math.sin(angle) });

    const leaves = childMap.get(branchId) ?? [];
    const spread = Math.PI / Math.max(branches.length, 2);
    leaves.forEach((leafId, li) => {
      const leafAngle = angle + spread * (li - (leaves.length - 1) / 2) * 0.6;
      pos.set(leafId, { x: R2 * Math.cos(leafAngle), y: R2 * Math.sin(leafAngle) });
    });
  });

  const nodePositions: NodePos[] = nodes.map((n) => ({
    ...n,
    x: pos.get(n.id)?.x ?? 0,
    y: pos.get(n.id)?.y ?? 0,
  }));

  const edgePaths: EdgePath[] = edges.map((e) => {
    const s = pos.get(e.source) ?? { x: 0, y: 0 };
    const t = pos.get(e.target) ?? { x: 0, y: 0 };
    const cx = (s.x + t.x) / 2;
    const cy = (s.y + t.y) / 2;
    return { ...e, path: `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}` };
  });

  return { nodes: nodePositions, edges: edgePaths };
}

// ── Visual constants ──────────────────────────────────────────────────────────

const DEPTH_FILL = ["#6366f1", "#0ea5e9", "#10b981"];
const DEPTH_R = [56, 38, 28];
const DEPTH_FS = [12, 10, 9];
const DEPTH_FW = ["700", "600", "500"];
const MAX_LINE = [14, 13, 11];

function wrapLabel(label: string, maxChars: number): string[] {
  const words = label.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
    if (lines.length === 2) { cur = ""; break; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Transform { x: number; y: number; scale: number }

export function MindMap({ data }: { data: MindmapData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tx, setTx] = useState<Transform>({ x: 450, y: 320, scale: 1 });
  const dragging = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const { nodes, edges } = useMemo(() => computeLayout(data), [data]);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setTx((t) => ({ ...t, scale: Math.max(0.25, Math.min(3, t.scale * factor)) }));
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = { sx: e.clientX, sy: e.clientY, ox: tx.x, oy: tx.y };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    setTx((t) => ({
      ...t,
      x: dragging.current!.ox + e.clientX - dragging.current!.sx,
      y: dragging.current!.oy + e.clientY - dragging.current!.sy,
    }));
  }

  function onMouseUp() { dragging.current = null; }

  return (
    <svg
      ref={svgRef}
      className="h-full w-full select-none cursor-grab active:cursor-grabbing"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      aria-label="Mind map diagram"
    >
      <g transform={`translate(${tx.x},${tx.y}) scale(${tx.scale})`}>
        {/* Edges */}
        {edges.map((e, i) => (
          <path
            key={i}
            d={e.path}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
        ))}

        {/* Nodes */}
        {nodes.map((n) => {
          const color = DEPTH_FILL[n.depth] ?? "#94a3b8";
          const r = DEPTH_R[n.depth] ?? 24;
          const fs = DEPTH_FS[n.depth] ?? 10;
          const fw = DEPTH_FW[n.depth] ?? "500";
          const mc = MAX_LINE[n.depth] ?? 12;
          const lines = wrapLabel(n.label, mc);
          const lh = fs + 3;
          const totalH = lines.length * lh;

          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={r}
                fill={color}
                fillOpacity="0.12"
                stroke={color}
                strokeWidth="2"
              />
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={n.x}
                  y={n.y - totalH / 2 + li * lh + lh * 0.75}
                  textAnchor="middle"
                  fontSize={fs}
                  fontWeight={fw}
                  fill={color}
                  fontFamily="inherit"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </g>

      {/* Legend */}
      <g transform="translate(12,12)" fontSize="10" fontFamily="inherit">
        {[["Root", 0], ["Branch", 1], ["Leaf", 2]].map(([label, depth], i) => (
          <g key={i} transform={`translate(0,${i * 18})`}>
            <circle r="5" cx="6" cy="0" fill={DEPTH_FILL[depth as number]} fillOpacity="0.25" stroke={DEPTH_FILL[depth as number]} strokeWidth="1.5" />
            <text x="16" y="4" fill="#94a3b8">{label as string}</text>
          </g>
        ))}
        <text y={72} fill="#64748b" fontSize="9">Scroll to zoom · drag to pan</text>
      </g>
    </svg>
  );
}
