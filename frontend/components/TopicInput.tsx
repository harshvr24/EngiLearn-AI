"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

const EXAMPLES = [
  "Reinforcement Learning",
  "Linear Algebra",
  "Quantum Computing",
  "Data Structures",
  "Thermodynamics",
  "Neural Networks",
];

export function TopicInput({
  onSubmit,
  loading,
}: {
  onSubmit: (topic: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");

  function submit(raw: string) {
    const topic = raw.trim();
    if (!topic || loading) return;
    onSubmit(topic);
  }

  return (
    <div className="mx-auto flex min-h-[78vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Powered by multi-agent AI
      </div>
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        What do you want to learn?
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Enter any technical topic. EngiLearn designs a personalized
        syllabus and teaches it to you, step by step.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="mt-8 flex w-full gap-2"
      >
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Binary Search Trees"
          disabled={loading}
          className="h-12 text-base"
        />
        <Button
          type="submit"
          disabled={loading || !value.trim()}
          className="h-12 px-5"
        >
          {loading ? (
            "Building…"
          ) : (
            <>
              Start <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setValue(ex);
              submit(ex);
            }}
            disabled={loading}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
