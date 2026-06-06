"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

import { cn } from "@/lib/utils";

/** Animate each word up into place on first view (from the Prisma hero). */
export function WordsPullUp({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <span ref={ref} className={cn("inline-flex flex-wrap", className)}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ y: 24, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{
            duration: 0.6,
            delay: delay + i * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="inline-block"
          style={{ marginRight: i === words.length - 1 ? 0 : "0.25em" }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
