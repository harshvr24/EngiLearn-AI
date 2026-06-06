"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Soft, performant gradient-aurora background in brand blues.
 * Pure CSS blobs gently drifting; respects prefers-reduced-motion.
 */
export function AuroraBackground({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  const float = (dx: number, dy: number, dur: number) =>
    reduce
      ? undefined
      : {
          x: [0, dx, 0],
          y: [0, dy, 0],
          scale: [1, 1.08, 1],
          transition: {
            duration: dur,
            repeat: Infinity,
            ease: "easeInOut" as const,
          },
        };

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <motion.div
        animate={float(60, 40, 19)}
        className="absolute -left-24 -top-32 h-[34rem] w-[34rem] rounded-full bg-primary/25 blur-[100px]"
      />
      <motion.div
        animate={float(-50, 30, 23)}
        className="absolute -right-20 top-10 h-[30rem] w-[30rem] rounded-full bg-sky-400/20 blur-[100px] dark:bg-sky-500/20"
      />
      <motion.div
        animate={float(30, -40, 27)}
        className="absolute bottom-[-10rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-indigo-400/20 blur-[110px] dark:bg-indigo-500/15"
      />
      {/* Fade into the page so content stays readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-background" />
    </div>
  );
}
