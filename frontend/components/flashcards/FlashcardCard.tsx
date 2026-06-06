"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, HelpCircle, RotateCcw } from "lucide-react";

import type { SRSCard } from "@/lib/types";
import { Button } from "../ui/button";

interface Props {
  card: SRSCard;
  onRate: (quality: 0 | 3 | 5) => void;
}

const FLIP = { duration: 0.38, ease: [0.16, 1, 0.3, 1] as const };

export function FlashcardCard({ card, onRate }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  function flip() {
    setFlipped((f) => !f);
    setShowHint(false);
  }

  function handleRate(q: 0 | 3 | 5) {
    setFlipped(false);
    setShowHint(false);
    onRate(q);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/*
        Each face is conditionally rendered via AnimatePresence — only one
        face exists in the DOM at a time, so overlap is impossible regardless
        of browser CSS 3D support.
      */}
      <div
        className="relative h-64 w-full max-w-lg cursor-pointer select-none"
        style={{ perspective: "1200px" }}
        onClick={flip}
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Show question" : "Reveal answer"}
        onKeyDown={(e) => e.key === "Enter" && flip()}
      >
        <AnimatePresence initial={false} mode="wait">
          {!flipped ? (
            <motion.div
              key="front"
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={FLIP}
              style={{ perspective: "1200px" }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center shadow-md"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Question
              </p>
              <p className="text-xl font-medium leading-relaxed text-foreground">
                {card.front}
              </p>
              {showHint && (
                <p className="mt-4 rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
                  {card.hint}
                </p>
              )}
              <p className="mt-6 text-xs text-muted-foreground">
                Click to reveal answer
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={FLIP}
              style={{ perspective: "1200px" }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center shadow-md"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                Answer
              </p>
              <p className="text-xl font-medium leading-relaxed text-foreground">
                {card.back}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      {!flipped ? (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowHint((h) => !h);
            }}
            className="gap-1.5 text-muted-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            {showHint ? "Hide hint" : "Hint"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              flip();
            }}
            className="gap-1.5"
          >
            <Eye className="h-4 w-4" />
            Reveal answer
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">How well did you know this?</p>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              className="border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={() => handleRate(0)}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Again
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
              onClick={() => handleRate(3)}
            >
              Hard
            </Button>
            <Button
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => handleRate(5)}
            >
              Easy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
