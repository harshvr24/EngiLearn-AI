"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Brain,
  ChevronRight,
  Flame,
  LayoutDashboard,
  TrendingUp,
} from "lucide-react";

import { ProgressMap } from "@/components/dashboard/ProgressMap";
import { StreakCalendar } from "@/components/dashboard/StreakCalendar";
import {
  computeMastery,
  getProgress,
  getStreak,
  listSessions,
} from "@/lib/storage";
import type { StoredSession, StreakData, TopicProgress } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TopicEntry {
  session: StoredSession;
  progress: TopicProgress;
  mastery: number;
}

const EMPTY_STREAK: StreakData = {
  current: 0,
  longest: 0,
  lastDate: "",
  history: [],
};

export default function DashboardPage() {
  const router = useRouter();
  function onContinueCourse(_session: StoredSession) {
    router.push("/");
  }
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, TopicProgress>>({});
  const [streak, setStreak] = useState<StreakData>(EMPTY_STREAK);

  useEffect(() => {
    setSessions(listSessions());
    setProgressMap(getProgress());
    setStreak(getStreak());
  }, []);

  const entries = useMemo<TopicEntry[]>(() => {
    return sessions
      .map((session) => {
        const prog = progressMap[session.topic] ?? {
          mastery: 0,
          sessionsCompleted: 0,
          lastStudied: new Date(session.created_at).toISOString().split("T")[0],
          quizScores: [],
        };
        return {
          session,
          progress: prog,
          mastery: computeMastery(prog),
        };
      })
      .sort((a, b) => {
        // Most recently studied first
        return b.progress.lastStudied.localeCompare(a.progress.lastStudied);
      });
  }, [sessions, progressMap]);

  const weakEntries = useMemo(
    () => entries.filter((e) => e.mastery < 40),
    [entries],
  );
  const strongEntries = useMemo(
    () => entries.filter((e) => e.mastery >= 70),
    [entries],
  );
  const totalLessons = useMemo(
    () => entries.reduce((sum, e) => sum + e.progress.sessionsCompleted, 0),
    [entries],
  );

  if (sessions.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <LayoutDashboard className="mx-auto mb-4 h-14 w-14 text-muted-foreground/30" />
        <p className="font-serif text-2xl font-semibold text-foreground">
          Your dashboard is empty
        </p>
        <p className="mt-2 text-muted-foreground">
          Start a course from the Home tab to see your progress here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      {/* Page title */}
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">
          Your Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Track your learning progress, streaks, and weak spots.
        </p>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          value={String(entries.length)}
          label="Topics studied"
          color="text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400"
        />
        <StatCard
          icon={<Flame className="h-5 w-5" />}
          value={String(streak.current)}
          label="Day streak"
          color="text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400"
        />
        <StatCard
          icon={<Brain className="h-5 w-5" />}
          value={String(totalLessons)}
          label="Lessons completed"
          color="text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          value={
            entries.length > 0
              ? `${Math.round(entries.reduce((s, e) => s + e.mastery, 0) / entries.length)}%`
              : "—"
          }
          label="Avg. mastery"
          color="text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400"
        />
      </div>

      {/* ── Streak Calendar ────────────────────────────────────────────────── */}
      <Section title="Study Streak" icon={<Flame className="h-4 w-4 text-orange-500" />}>
        <StreakCalendar streak={streak} />
      </Section>

      {/* ── Progress Map ──────────────────────────────────────────────────── */}
      <Section
        title="All Topics"
        icon={<BookOpen className="h-4 w-4 text-primary" />}
        count={entries.length}
      >
        <ProgressMap entries={entries} onContinue={onContinueCourse} />
      </Section>

      {/* ── Weak Topics Heatmap ───────────────────────────────────────────── */}
      {weakEntries.length > 0 && (
        <Section
          title="Needs Revision"
          icon={<TrendingUp className="h-4 w-4 text-red-500" />}
          count={weakEntries.length}
          subtitle="Topics below 40% mastery — drill these with flashcards or a quiz."
        >
          <WeakHeatmap entries={weakEntries} onContinue={onContinueCourse} />
        </Section>
      )}

      {/* ── Strong Topics ─────────────────────────────────────────────────── */}
      {strongEntries.length > 0 && (
        <Section
          title="Mastered"
          icon={<TrendingUp className="h-4 w-4 text-green-500" />}
          count={strongEntries.length}
        >
          <div className="flex flex-wrap gap-2">
            {strongEntries.map((e) => (
              <button
                key={e.session.session_id}
                type="button"
                onClick={() => onContinueCourse(e.session)}
                className="flex items-center gap-1.5 rounded-full border border-green-300 bg-green-50 px-3 py-1 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-950/60"
              >
                {e.session.topic}
                <span className="opacity-70">{e.mastery}%</span>
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          color,
        )}
      >
        {icon}
      </span>
      <div>
        <p className="text-2xl font-bold leading-none text-foreground">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  subtitle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-serif text-xl font-semibold text-foreground">
            {title}
          </h2>
          {count !== undefined && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function WeakHeatmap({
  entries,
  onContinue,
}: {
  entries: TopicEntry[];
  onContinue: (session: StoredSession) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(({ session, mastery }) => (
        <button
          key={session.session_id}
          type="button"
          onClick={() => onContinue(session)}
          className="group flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left transition-all hover:border-red-400 dark:border-red-900 dark:bg-red-950/30"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-red-800 dark:text-red-300">
              {session.topic}
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-red-200 dark:bg-red-900">
              <div
                className="h-full rounded-full bg-red-500 transition-all"
                style={{ width: `${mastery}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-sm font-bold text-red-600 dark:text-red-400">
              {mastery}%
            </span>
            <ChevronRight className="h-4 w-4 text-red-400 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </button>
      ))}
    </div>
  );
}
