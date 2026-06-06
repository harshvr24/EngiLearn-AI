"use client";

import { useRef } from "react";
import {
  motion,
  type MotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Boxes,
  GraduationCap,
  type LucideIcon,
  MessageCircle,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface Face {
  kind?: "cover" | "cta";
  eyebrow?: string;
  title: string;
  body: string;
  Icon?: LucideIcon;
}

/** 8 faces = 4 sheets. Reads: cover, then spreads (1,2) (3,4) (5,6) (7,back). */
const FACES: Face[] = [
  {
    kind: "cover",
    title: "EngiLearn AI",
    body: "Your adaptive AI instructor — for anything you want to learn.",
  },
  {
    eyebrow: "01 · The idea",
    title: "What is EngiLearn?",
    body: "A personal AI instructor that turns any topic into a structured course — then teaches it to you, one concept at a time.",
    Icon: GraduationCap,
  },
  {
    eyebrow: "02 · Start",
    title: "Tell it any topic",
    body: "From binary search trees to thermodynamics. A single line is all it needs to begin.",
    Icon: Search,
  },
  {
    eyebrow: "03 · Design",
    title: "Two agents draft your syllabus",
    body: "An Instructor and a Teaching-Assistant agent collaborate to outline a goal-aligned curriculum, just for you.",
    Icon: Users,
  },
  {
    eyebrow: "04 · Teach",
    title: "A live, streaming instructor",
    body: "Lessons arrive token-by-token, topic by topic — never an intimidating wall of text.",
    Icon: Sparkles,
  },
  {
    eyebrow: "05 · Adapt",
    title: "Ask anything, anytime",
    body: "Pause, ask questions, and the instructor adjusts to your pace and fills the gaps.",
    Icon: MessageCircle,
  },
  {
    eyebrow: "06 · Open",
    title: "Free & open underneath",
    body: "LangChain multi-agents on free LLMs (Groq · Gemini · Ollama), served by FastAPI + Postgres + Redis.",
    Icon: Boxes,
  },
  {
    kind: "cta",
    title: "Ready to learn?",
    body: "Pick a topic and your first lesson begins in seconds.",
  },
];

const SHEETS = FACES.length / 2;
const ENTER = 0.16; // first slice of scroll: book rises in, cover showing
const TAIL = 0.06; // last slice: final spread settles

function FaceContent({
  face,
  onStart,
}: {
  face: Face;
  onStart: () => void;
}) {
  if (face.kind === "cover") {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden bg-gradient-to-br from-primary via-primary to-blue-700 text-center text-primary-foreground">
        <div className="pointer-events-none absolute inset-3 rounded-2xl border border-white/15" />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h3 className="font-serif text-4xl font-semibold tracking-tight">
          {face.title}
        </h3>
        <div className="h-px w-16 bg-white/40" />
        <p className="max-w-[18rem] text-sm text-primary-foreground/80">
          {face.body}
        </p>
        <span className="absolute bottom-6 text-[0.65rem] uppercase tracking-[0.3em] text-primary-foreground/60">
          flip the pages →
        </span>
      </div>
    );
  }

  if (face.kind === "cta") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <h3 className="font-serif text-3xl font-semibold text-foreground">
          {face.title}
        </h3>
        <p className="max-w-[18rem] text-sm text-muted-foreground">
          {face.body}
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:scale-[1.03]"
        >
          Start learning <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      {face.Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <face.Icon className="h-6 w-6" />
        </span>
      )}
      {face.eyebrow && (
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {face.eyebrow}
        </span>
      )}
      <h3 className="font-serif text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
        {face.title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
        {face.body}
      </p>
    </div>
  );
}

function PageSurface({
  face,
  side,
  pageNo,
  onStart,
}: {
  face: Face;
  side: "left" | "right";
  pageNo?: number;
  onStart: () => void;
}) {
  const plain = face.kind === undefined;
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden border-border text-card-foreground shadow-md sm:p-10",
        plain ? "bg-card p-8" : "bg-card p-8",
        side === "right"
          ? "rounded-r-[1.25rem] border-y border-r"
          : "rounded-l-[1.25rem] border-y border-l",
      )}
    >
      <FaceContent face={face} onStart={onStart} />
      {/* Inner spine shadow near the binding */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 w-14",
          side === "right"
            ? "left-0 bg-gradient-to-r from-black/12 to-transparent"
            : "right-0 bg-gradient-to-l from-black/12 to-transparent",
        )}
      />
      {plain && pageNo !== undefined && (
        <span
          className={cn(
            "absolute bottom-4 text-xs text-muted-foreground/60",
            side === "right" ? "right-6" : "left-6",
          )}
        >
          {pageNo}
        </span>
      )}
    </div>
  );
}

function Leaf({
  progress,
  index,
  start,
  end,
  span,
  isLast,
  front,
  back,
  onStart,
}: {
  progress: MotionValue<number>;
  index: number;
  start: number;
  end: number;
  span: number;
  isLast: boolean;
  front: Face;
  back: Face;
  onStart: () => void;
}) {
  const rotateY = useTransform(progress, [start, end], [0, -180], {
    clamp: true,
  });
  const zIndex = useTransform(progress, (p) =>
    p < start ? SHEETS - index : p >= end ? index + 1 : SHEETS + 2,
  );
  const frontShade = useTransform(rotateY, [0, -90], [0, 0.45], {
    clamp: true,
  });
  const backShade = useTransform(rotateY, [-90, -180], [0.5, 0], {
    clamp: true,
  });

  // Non-overlapping scroll windows: at most ONE face per side has opacity=1.
  // front is the right page until this leaf's midpoint (start+end)/2.
  // back is the left page from that midpoint until the NEXT leaf's midpoint —
  // preventing multiple turned leaves' backs from being visible simultaneously.
  const mid = (start + end) / 2;
  const nextMid = end + span / 2;

  const frontOpacity = useTransform(progress, (p) => (p < mid ? 1 : 0));
  const backOpacity = useTransform(progress, (p) =>
    p >= mid && (isLast || p < nextMid) ? 1 : 0,
  );

  return (
    <motion.div
      style={{
        rotateY,
        zIndex,
        transformStyle: "preserve-3d",
        WebkitTransformStyle: "preserve-3d",
        transformOrigin: "left center",
      }}
      className="absolute left-1/2 top-0 h-full w-1/2"
    >
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-r-[1.25rem]"
        style={{ opacity: frontOpacity }}
      >
        <PageSurface
          face={front}
          side="right"
          pageNo={2 * index}
          onStart={onStart}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: frontShade }}
        />
      </motion.div>
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-l-[1.25rem]"
        style={{
          opacity: backOpacity,
          transform: "rotateY(180deg)",
        }}
      >
        <PageSurface
          face={back}
          side="left"
          pageNo={2 * index + 1}
          onStart={onStart}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: backShade }}
        />
      </motion.div>
    </motion.div>
  );
}

function Book({
  progress,
  onStart,
}: {
  progress: MotionValue<number>;
  onStart: () => void;
}) {
  // Rise-up entrance: book lifts in and un-tilts, showing the cover.
  const y = useTransform(progress, [0, ENTER], ["44%", "0%"], { clamp: true });
  const rotateX = useTransform(progress, [0, ENTER], [26, 0], { clamp: true });
  const opacity = useTransform(progress, [0, ENTER * 0.6], [0, 1], {
    clamp: true,
  });

  const span = (1 - ENTER - TAIL) / SHEETS;
  const sheets = Array.from({ length: SHEETS }, (_, i) => ({
    front: FACES[2 * i],
    back: FACES[2 * i + 1],
    start: ENTER + i * span,
    end: ENTER + (i + 1) * span,
  }));

  return (
    <motion.div
      style={{ y, rotateX, opacity, transformStyle: "preserve-3d", WebkitTransformStyle: "preserve-3d" }}
      className="relative h-[clamp(24rem,72vh,42rem)] w-[clamp(34rem,88vw,60rem)]"
    >
      {/* Soft ground shadow */}
      <div className="absolute -bottom-10 left-1/2 h-12 w-3/4 -translate-x-1/2 rounded-[50%] bg-black/30 blur-2xl" />

      {/* Page-block thickness on the outer edges */}
      <div className="absolute -left-[7px] bottom-2 top-2 w-2 rounded-l-md bg-gradient-to-l from-border to-card shadow" />
      <div className="absolute -right-[7px] bottom-2 top-2 w-2 rounded-r-md bg-gradient-to-r from-border to-card shadow" />

      {/* Base pages under the leaves */}
      <div className="absolute left-0 top-0 h-full w-1/2">
        <div className="flex h-full w-full items-center justify-center rounded-l-[1.25rem] border-y border-l border-border bg-card text-muted-foreground/20">
          <GraduationCap className="h-14 w-14" />
        </div>
      </div>
      <div className="absolute right-0 top-0 h-full w-1/2">
        <div className="flex h-full w-full items-center justify-center rounded-r-[1.25rem] border-y border-r border-border bg-card text-muted-foreground/20">
          <GraduationCap className="h-14 w-14" />
        </div>
      </div>

      {sheets.map((s, i) => (
        <Leaf
          key={i}
          progress={progress}
          index={i}
          start={s.start}
          end={s.end}
          span={span}
          isLast={i === SHEETS - 1}
          front={s.front}
          back={s.back}
          onStart={onStart}
        />
      ))}

      {/* Spine shadow */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[60] w-14 -translate-x-1/2 bg-gradient-to-r from-transparent via-foreground/12 to-transparent" />
    </motion.div>
  );
}

export function ScrollBook({ onStart }: { onStart?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.0005,
  });

  const handleStart =
    onStart ?? (() => window.scrollTo({ top: 0, behavior: "smooth" }));

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-3xl px-4 pt-16 text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          The story
        </span>
        <h2 className="mt-2 font-serif text-3xl font-semibold text-foreground sm:text-4xl">
          How EngiLearn works
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Scroll to flip through the book.
        </p>
      </div>

      {/* Mobile / reduced-motion: a simple stacked read */}
      <div
        className={cn(
          "mx-auto max-w-md space-y-4 px-4 py-10",
          reduce ? "block" : "md:hidden",
        )}
      >
        {FACES.map((face, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="p-6">
              <FaceContent face={face} onStart={handleStart} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: scroll-driven 3D flip book */}
      {!reduce && (
        <div ref={ref} className="relative hidden h-[560vh] md:block">
          <div className="sticky top-0 flex h-screen items-center justify-center px-4">
            <div style={{ perspective: 2400 }} className="relative">
              <Book progress={progress} onStart={handleStart} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
