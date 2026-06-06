"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";

const BLOOM_COLORS: Record<string, string> = {
  remember: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  understand: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  apply: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  analyze: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  evaluate: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  create: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

interface Props {
  question: Question;
  userAnswer: string;
  correct: boolean;
}

export function QuizBreakdown({ question, userAnswer, correct }: Props) {
  const bloomClass =
    BLOOM_COLORS[question.bloom_level] ??
    "bg-muted text-muted-foreground";

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        correct
          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
          : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
      )}
    >
      <div className="flex items-start gap-3">
        {correct ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        )}

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", bloomClass)}>
              {question.bloom_level}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
              {question.type === "mcq" ? "MCQ" : question.type}
            </span>
          </div>

          <p className="text-sm font-medium text-foreground">{question.question}</p>

          {!correct && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Your answer: </span>
              {userAnswer || "(no answer)"}
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {correct ? "Correct: " : "Answer: "}
            </span>
            {question.answer}
          </p>

          <p className="rounded-lg bg-background/60 px-3 py-2 text-sm text-muted-foreground">
            {question.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
