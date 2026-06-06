"use client";

import { BookOpen, ChevronRight, Clock, TrendingUp } from "lucide-react";

import type { StoredSession } from "@/lib/types";
import { computeMastery } from "@/lib/storage";
import type { TopicProgress } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface TopicEntry {
  session: StoredSession;
  progress: TopicProgress;
  mastery: number;
}

interface Props {
  entries: TopicEntry[];
  onContinue: (session: StoredSession) => void;
}

function masteryColor(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function masteryLabel(score: number) {
  if (score >= 70) return { text: "Strong", cls: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40" };
  if (score >= 40) return { text: "Learning", cls: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40" };
  return { text: "Weak", cls: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40" };
}

function relativeDate(iso: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 86_400_000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  return `${Math.floor(diff / 30)} months ago`;
}

export function ProgressMap({ entries, onContinue }: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <BookOpen className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">
          No topics studied yet. Start a course from the Home tab.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(({ session, progress, mastery }) => {
        const { text, cls } = masteryLabel(mastery);
        return (
          <div
            key={session.session_id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            {/* Topic + badge */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-snug text-foreground">
                {session.topic}
              </h3>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  cls,
                )}
              >
                {text}
              </span>
            </div>

            {/* Mastery bar */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Mastery
                </span>
                <span className="font-medium text-foreground">{mastery}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", masteryColor(mastery))}
                  style={{ width: `${mastery}%` }}
                />
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {relativeDate(progress.lastStudied)}
              </span>
              <span>{progress.sessionsCompleted} lesson{progress.sessionsCompleted !== 1 ? "s" : ""}</span>
            </div>

            {/* Continue */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onContinue(session)}
              className="mt-auto gap-1.5"
            >
              Continue
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
