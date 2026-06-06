"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Layers } from "lucide-react";

import type { FlashcardDeck, SRSCard } from "@/lib/types";
import { isDue, rate, sortDueFirst } from "@/lib/srs";
import { saveDeck } from "@/lib/storage";
import { Button } from "../ui/button";
import { FlashcardCard } from "./FlashcardCard";

type Mode = "all" | "due";

interface Props {
  deck: FlashcardDeck;
  onClose: () => void;
  onDeckUpdate: (deck: FlashcardDeck) => void;
}

export function FlashcardSession({ deck, onClose, onDeckUpdate }: Props) {
  const [mode, setMode] = useState<Mode>("due");
  const [started, setStarted] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [results, setResults] = useState<{ card: SRSCard; quality: number }[]>([]);

  const queue = useMemo(() => {
    const cards = mode === "due" ? deck.cards.filter(isDue) : deck.cards;
    return sortDueFirst(cards);
  }, [deck.cards, mode]);

  const dueCount = deck.cards.filter(isDue).length;

  const currentCard = queue[cardIndex] ?? null;
  const done = started && cardIndex >= queue.length;

  function handleRate(quality: 0 | 3 | 5) {
    if (!currentCard) return;

    const updatedCard = rate(currentCard, quality);
    const updatedCards = deck.cards.map((c) =>
      c.id === currentCard.id ? updatedCard : c,
    );
    const updatedDeck = { ...deck, cards: updatedCards };
    saveDeck(updatedDeck);
    onDeckUpdate(updatedDeck);

    setResults((r) => [...r, { card: currentCard, quality }]);
    setCardIndex((i) => i + 1);
  }

  function restart() {
    setCardIndex(0);
    setResults([]);
    setStarted(true);
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Layers className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            {deck.name}
          </h2>
          <p className="mt-1 text-muted-foreground">
            {deck.cards.length} cards · {dueCount} due today
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setMode("all");
              setStarted(true);
            }}
          >
            Study all ({deck.cards.length})
          </Button>
          <Button
            onClick={() => {
              setMode("due");
              setStarted(true);
            }}
            disabled={dueCount === 0}
          >
            Study due ({dueCount})
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Back to decks
        </Button>
      </div>
    );
  }

  if (done) {
    const correct = results.filter((r) => r.quality >= 3).length;
    const pct = queue.length > 0 ? Math.round((correct / queue.length) * 100) : 0;
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Session complete!
          </h2>
          <p className="mt-2 text-muted-foreground">
            {correct} / {queue.length} correct ({pct}%)
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {deck.cards.filter(isDue).length} cards due next review
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={restart}>
            Study again
          </Button>
          <Button onClick={onClose}>Back to decks</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(cardIndex / queue.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {cardIndex + 1} / {queue.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentCard?.id ?? cardIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          {currentCard && (
            <FlashcardCard card={currentCard} onRate={handleRate} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
