"use client";

import { BookOpen, Plus, Trash2 } from "lucide-react";

import type { StoredSession } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export function SessionsSidebar({
  sessions,
  currentId,
  onSelect,
  onDelete,
  onNew,
}: {
  sessions: StoredSession[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="p-3">
        <Button
          variant="outline"
          onClick={onNew}
          className="w-full justify-start"
        >
          <Plus className="h-4 w-4" /> New course
        </Button>
      </div>

      <div className="px-3 pb-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Your courses
        </p>
      </div>

      <nav className="scroll-thin flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            No courses yet. Start one above.
          </p>
        ) : (
          sessions.map((s) => {
            const active = s.session_id === currentId;
            return (
              <div
                key={s.session_id}
                className={cn(
                  "group flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "text-foreground hover:bg-muted",
                )}
                onClick={() => onSelect(s.session_id)}
              >
                <BookOpen
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.topic}</div>
                  <div className="text-xs text-muted-foreground">
                    {timeAgo(s.created_at)}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${s.topic}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.session_id);
                  }}
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </nav>
    </div>
  );
}
