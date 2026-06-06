"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface Topic {
  title: string;
  blurb: string;
  Icon: LucideIcon;
}

/**
 * A suggested-topic tile that expands on hover/focus to reveal a short blurb
 * and a Start affordance. Clicking starts that topic. The `glass` variant is
 * for use over the dark video hero (translucent + light text).
 */
export function TopicCard({
  topic,
  disabled,
  glass,
  onSelect,
}: {
  topic: Topic;
  disabled?: boolean;
  glass?: boolean;
  onSelect: (title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { title, blurb, Icon } = topic;

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(title)}
      onHoverStart={() => setOpen(true)}
      onHoverEnd={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "group relative flex w-full flex-col rounded-xl border p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50",
        glass
          ? "border-white/15 bg-white/10 backdrop-blur-md hover:border-white/35 focus-visible:ring-white/60 focus-visible:ring-offset-transparent"
          : "border-border bg-card/80 backdrop-blur-sm hover:border-primary/40 hover:shadow-md focus-visible:ring-ring focus-visible:ring-offset-background",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            glass
              ? "bg-white/15 text-white group-hover:bg-white group-hover:text-slate-900"
              : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={cn(
            "font-medium",
            glass ? "text-white" : "text-foreground",
          )}
        >
          {title}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p
              className={cn(
                "pt-3 text-sm leading-relaxed",
                glass ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {blurb}
            </p>
            <span
              className={cn(
                "mt-3 inline-flex items-center gap-1 text-sm font-medium",
                glass ? "text-white" : "text-primary",
              )}
            >
              Start learning
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
