"use client";

import { useState } from "react";
import { BookOpen, Calendar, Layers, Plus, Trash2 } from "lucide-react";

import type { FlashcardDeck as DeckType } from "@/lib/types";
import { isDue } from "@/lib/srs";
import { removeDeck } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { FlashcardSession } from "./FlashcardSession";

interface Props {
  decks: DeckType[];
  onDecksChange: (decks: DeckType[]) => void;
  onCreateDeck: () => void;
}

export function FlashcardDeckView({ decks, onDecksChange, onCreateDeck }: Props) {
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);

  const activeDeck = decks.find((d) => d.id === activeDeckId) ?? null;

  function handleDeleteDeck(id: string) {
    removeDeck(id);
    onDecksChange(decks.filter((d) => d.id !== id));
    if (activeDeckId === id) setActiveDeckId(null);
  }

  function handleDeckUpdate(updated: DeckType) {
    onDecksChange(decks.map((d) => (d.id === updated.id ? updated : d)));
  }

  if (activeDeck) {
    return (
      <FlashcardSession
        deck={activeDeck}
        onClose={() => setActiveDeckId(null)}
        onDeckUpdate={handleDeckUpdate}
      />
    );
  }

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Layers className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="font-medium text-foreground">No flashcard decks yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a document or enter a topic to generate your first deck.
          </p>
        </div>
        <Button onClick={onCreateDeck} className="gap-2">
          <Plus className="h-4 w-4" />
          Create deck
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-foreground">
          My Decks
        </h2>
        <Button size="sm" onClick={onCreateDeck} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New deck
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((deck) => {
          const dueCount = deck.cards.filter(isDue).length;
          return (
            <div
              key={deck.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveDeckId(deck.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActiveDeckId(deck.id)}
              className={cn(
                "group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm",
                "transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{deck.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {deck.cards.length} cards
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDeck(deck.id);
                  }}
                  aria-label="Delete deck"
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(deck.createdAt).toLocaleDateString()}
                </span>
                {dueCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    {dueCount} due
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
