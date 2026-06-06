"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, ChevronRight } from "lucide-react";

import type { FlashcardCard, Question, QuizResult } from "@/lib/types";
import { initCards } from "@/lib/srs";
import { appendQuizScore, saveDeck, saveQuizResult } from "@/lib/storage";
import { Button } from "../ui/button";
import { QuizBreakdown } from "./QuizBreakdown";

interface Props {
  questions: Question[];
  topic: string;
  onClose: () => void;
  onDecksCreated?: () => void;
}

interface AnswerState {
  [questionId: string]: string;
}

type Phase = "quiz" | "review";

export function QuizSession({ questions, topic, onClose, onDecksCreated }: Props) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [phase, setPhase] = useState<Phase>("quiz");
  const [savedAsFlashcards, setSavedAsFlashcards] = useState(false);

  const q = questions[current];

  function handleAnswer(answer: string) {
    setAnswers((prev) => ({ ...prev, [q.id]: answer }));
  }

  function handleNext() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      submitQuiz();
    }
  }

  function submitQuiz() {
    const results = questions.map((question) => {
      const userAnswer = answers[question.id] ?? "";
      const correct =
        question.type === "mcq"
          ? userAnswer.trim().toLowerCase() ===
            question.answer.trim().toLowerCase()
          : false; // short/long are not auto-graded
      return { question_id: question.id, user_answer: userAnswer, correct };
    });

    const mcqResults = results.filter((r, i) => questions[i]?.type === "mcq");
    const score = mcqResults.filter((r) => r.correct).length;
    const scoreFraction = mcqResults.length > 0 ? score / mcqResults.length : 0;

    // Record quiz score into progress tracking
    if (topic && mcqResults.length > 0) {
      appendQuizScore(topic, scoreFraction);
    }

    const quizResult: QuizResult = {
      id: `${Date.now()}`,
      topic,
      date: new Date().toISOString(),
      score,
      total: questions.length,
      questions: results,
    };
    saveQuizResult(quizResult);
    setPhase("review");
  }

  function saveAsFlashcards() {
    const cards: FlashcardCard[] = questions.map((q) => ({
      front: q.question,
      back: q.answer,
      hint: q.explanation.slice(0, 100),
    }));
    const srsCards = initCards(cards);
    saveDeck({
      id: `quiz-${Date.now()}`,
      name: `Quiz: ${topic}`,
      source: topic,
      createdAt: Date.now(),
      cards: srsCards,
    });
    setSavedAsFlashcards(true);
    onDecksCreated?.();
  }

  const score = Object.values(answers).filter((a, i) => {
    const question = questions[i];
    return question?.type === "mcq" && a.trim().toLowerCase() === question.answer.trim().toLowerCase();
  }).length;

  const mcqCount = questions.filter((q) => q.type === "mcq").length;

  if (phase === "review") {
    return (
      <div className="flex flex-col gap-6">
        {/* Summary header */}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <Award className="h-12 w-12 text-primary" />
          <div>
            <p className="font-serif text-2xl font-semibold text-foreground">
              Quiz complete!
            </p>
            {mcqCount > 0 && (
              <p className="mt-1 text-muted-foreground">
                {score} / {mcqCount} MCQs correct (
                {Math.round((score / mcqCount) * 100)}%)
              </p>
            )}
            {mcqCount === 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Short / long answers are not auto-graded — review your answers below.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {!savedAsFlashcards && (
              <Button variant="outline" size="sm" onClick={saveAsFlashcards}>
                Save as flashcards
              </Button>
            )}
            {savedAsFlashcards && (
              <span className="text-sm text-green-600">Saved to decks!</span>
            )}
            <Button size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="flex flex-col gap-3">
          {questions.map((question, i) => (
            <QuizBreakdown
              key={question.id}
              question={question}
              userAnswer={answers[question.id] ?? ""}
              correct={
                question.type === "mcq"
                  ? (answers[question.id] ?? "").trim().toLowerCase() ===
                    question.answer.trim().toLowerCase()
                  : false
              }
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {current + 1} / {questions.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {q && (
            <>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {q.type === "mcq" ? "Multiple Choice" : q.type === "short" ? "Short Answer" : "Long Answer"}
                </p>
                <p className="text-lg font-medium text-foreground">{q.question}</p>
              </div>

              {q.type === "mcq" && q.options ? (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleAnswer(opt)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                        answers[q.id] === opt
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : q.type === "short" ? (
                <input
                  type="text"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Your answer…"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <textarea
                  rows={5}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Write your detailed answer…"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={!answers[q?.id ?? ""]}
          className="gap-2"
        >
          {current < questions.length - 1 ? (
            <>
              Next <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            "Submit quiz"
          )}
        </Button>
      </div>
    </div>
  );
}
