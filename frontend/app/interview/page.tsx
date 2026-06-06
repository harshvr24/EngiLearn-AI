"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import {
  Award,
  Brain,
  Briefcase,
  ChevronRight,
  Code2,
  GraduationCap,
  Network,
  RotateCcw,
  Send,
  Upload,
  Users,
} from "lucide-react";

import {
  getInterviewQuestion,
  parseResume,
  streamInterviewFeedback,
} from "@/lib/api";
import type {
  InterviewMode,
  InterviewQA,
  ResumeProfile,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = "upload" | "mode" | "interview" | "summary";

const MODES: {
  id: InterviewMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: "project_deep_dive",
    label: "Project Deep Dive",
    description:
      "Questions about your listed projects, design decisions, and technical impact.",
    icon: <Code2 className="h-6 w-6" />,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400",
  },
  {
    id: "dsa",
    label: "DSA",
    description:
      "Data structures, algorithms, time/space complexity, and coding problem patterns.",
    icon: <Brain className="h-6 w-6" />,
    color:
      "text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400",
  },
  {
    id: "system_design",
    label: "System Design",
    description:
      "Design scalable distributed systems, APIs, databases, and caching strategies.",
    icon: <Network className="h-6 w-6" />,
    color:
      "text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400",
  },
  {
    id: "hr_behavioral",
    label: "HR Behavioral",
    description:
      "STAR method questions on teamwork, leadership, conflict resolution, and goals.",
    icon: <Users className="h-6 w-6" />,
    color:
      "text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400",
  },
];

const MAX_QUESTIONS = 6;

export default function InterviewPage() {
  const [step, setStep] = useState<Step>("upload");
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [mode, setMode] = useState<InterviewMode>("project_deep_dive");

  // Interview state
  const [history, setHistory] = useState<InterviewQA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [streamingFeedback, setStreamingFeedback] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  // ── Step 1: Upload ────────────────────────────────────────────────────────

  async function handleResumeFile(file: File) {
    setUploading(true);
    try {
      const p = await parseResume(file);
      setProfile(p);
      setStep("mode");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resume parsing failed.");
    } finally {
      setUploading(false);
    }
  }

  // ── Step 2 → Step 3: Start interview ─────────────────────────────────────

  async function startInterview(selectedMode: InterviewMode) {
    if (!profile) return;
    setMode(selectedMode);
    setHistory([]);
    setFeedback("");
    setFeedbackDone(false);
    setAnswer("");
    setStep("interview");
    setLoadingQuestion(true);
    try {
      const q = await getInterviewQuestion({
        profile,
        mode: selectedMode,
        history: [],
      });
      setCurrentQuestion(q);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate question.");
    } finally {
      setLoadingQuestion(false);
    }
  }

  // ── Step 3: Submit answer → stream feedback ───────────────────────────────

  async function submitAnswer() {
    if (!answer.trim() || !profile || streamingFeedback) return;
    const trimmedAnswer = answer.trim();
    setFeedback("");
    setFeedbackDone(false);
    setStreamingFeedback(true);

    try {
      await streamInterviewFeedback({
        req: {
          profile,
          mode,
          question: currentQuestion,
          answer: trimmedAnswer,
        },
        onToken: (tok) => setFeedback((f) => f + tok),
      });
      setFeedbackDone(true);
      setHistory((h) => [
        ...h,
        { question: currentQuestion, answer: trimmedAnswer },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Feedback stream failed.");
    } finally {
      setStreamingFeedback(false);
    }
  }

  async function nextQuestion() {
    if (!profile) return;
    const newHistory = [
      ...history,
      { question: currentQuestion, answer: answer.trim() },
    ];

    if (newHistory.length >= MAX_QUESTIONS) {
      setHistory(newHistory);
      setStep("summary");
      return;
    }

    setAnswer("");
    setFeedback("");
    setFeedbackDone(false);
    setLoadingQuestion(true);

    try {
      const q = await getInterviewQuestion({
        profile,
        mode,
        history: newHistory,
      });
      setCurrentQuestion(q);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate question.");
    } finally {
      setLoadingQuestion(false);
    }
  }

  function endSession() {
    const newHistory = feedbackDone
      ? [...history, { question: currentQuestion, answer: answer.trim() }]
      : history;
    setHistory(newHistory);
    setStep("summary");
  }

  // ── Step 4: Summary ───────────────────────────────────────────────────────

  function restart() {
    setHistory([]);
    setCurrentQuestion("");
    setAnswer("");
    setFeedback("");
    setFeedbackDone(false);
    setStep("mode");
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Briefcase className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Interview Prep
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload your resume, choose a mode, and practice with AI-powered feedback.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator step={step} />

      <AnimatePresence mode="wait">
        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mt-6"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleResumeFile(f);
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-border px-8 py-16 transition-all hover:border-primary/50 hover:bg-muted/30"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {uploading ? (
                  <Brain className="h-8 w-8 animate-pulse" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  {uploading ? "Parsing your resume…" : "Upload your resume"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  PDF or DOCX, up to 5 MB
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Profile + Mode ── */}
        {step === "mode" && profile && (
          <motion.div
            key="mode"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mt-6 flex flex-col gap-6"
          >
            {/* Profile summary */}
            <ProfileCard profile={profile} />

            {/* Mode selector */}
            <div>
              <h2 className="mb-3 font-serif text-lg font-semibold text-foreground">
                Choose interview mode
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => void startInterview(m.id)}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        m.color,
                      )}
                    >
                      {m.icon}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{m.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Interview chat ── */}
        {step === "interview" && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mt-6 flex flex-col gap-5"
          >
            {/* Progress */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Question {history.length + 1} of {MAX_QUESTIONS}
              </span>
              <span className="capitalize">
                {MODES.find((m) => m.id === mode)?.label}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${((history.length) / MAX_QUESTIONS) * 100}%`,
                }}
              />
            </div>

            {/* Question callout */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              {loadingQuestion ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Brain className="h-4 w-4 animate-pulse text-primary" />
                  Generating question…
                </div>
              ) : (
                <p className="text-base font-medium leading-relaxed text-foreground">
                  {currentQuestion}
                </p>
              )}
            </div>

            {/* Answer textarea */}
            {!feedbackDone && (
              <>
                <div className="relative">
                  <textarea
                    ref={answerRef}
                    rows={5}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={
                      mode === "dsa"
                        ? "Write your approach or code here…"
                        : "Type your answer here…"
                    }
                    disabled={streamingFeedback || loadingQuestion}
                    className={cn(
                      "w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground",
                      "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                      "disabled:opacity-60",
                      mode === "dsa" && "font-mono",
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        void submitAnswer();
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {mode === "dsa"
                      ? "Explain your approach and complexity"
                      : "Ctrl+Enter to submit"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={endSession}
                      className="text-muted-foreground"
                    >
                      End session
                    </Button>
                    <Button
                      size="sm"
                      onClick={submitAnswer}
                      disabled={
                        !answer.trim() || streamingFeedback || loadingQuestion
                      }
                      className="gap-2"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Submit
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Streaming feedback */}
            {(feedback || streamingFeedback) && (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Feedback
                </p>
                <div
                  className={cn(
                    "prose prose-sm dark:prose-invert max-w-none",
                    streamingFeedback && "streaming-caret",
                  )}
                >
                  <ReactMarkdown>{feedback}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Next / End controls — shown after feedback */}
            {feedbackDone && (
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={endSession}
                  className="text-muted-foreground"
                >
                  End session
                </Button>
                <Button
                  size="sm"
                  onClick={nextQuestion}
                  disabled={loadingQuestion}
                  className="gap-2"
                >
                  {history.length + 1 >= MAX_QUESTIONS
                    ? "View summary"
                    : "Next question"}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Step 4: Summary ── */}
        {step === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mt-6 flex flex-col gap-6"
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <Award className="h-14 w-14 text-primary" />
              <div>
                <p className="font-serif text-2xl font-semibold text-foreground">
                  Session complete!
                </p>
                <p className="mt-1 text-muted-foreground">
                  You answered {history.length} question
                  {history.length !== 1 ? "s" : ""} in{" "}
                  <span className="font-medium capitalize">
                    {MODES.find((m) => m.id === mode)?.label}
                  </span>{" "}
                  mode.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={restart} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Practice again
                </Button>
                <Button onClick={() => setStep("mode")} className="gap-2">
                  Change mode
                </Button>
              </div>
            </div>

            {/* Q&A history */}
            {history.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="font-serif text-lg font-semibold text-foreground">
                  Questions you answered
                </h2>
                {history.map((qa, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Q{i + 1}
                    </p>
                    <p className="font-medium text-foreground">{qa.question}</p>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                      {qa.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "upload", label: "Upload" },
    { id: "mode", label: "Mode" },
    { id: "interview", label: "Interview" },
    { id: "summary", label: "Summary" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
              i < currentIdx
                ? "bg-primary text-primary-foreground"
                : i === currentIdx
                  ? "border-2 border-primary bg-background text-primary"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {i + 1}
          </div>
          <span
            className={cn(
              "ml-1.5 text-xs font-medium",
              i === currentIdx ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className="mx-2 h-px w-6 bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}

function ProfileCard({ profile }: { profile: ResumeProfile }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-foreground">
            {profile.name || "Your profile"}
          </p>
          <p className="text-xs text-muted-foreground">
            {profile.experience[0] || "Experience not listed"}
          </p>
        </div>
      </div>

      {profile.skills.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.slice(0, 16).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
              >
                {skill}
              </span>
            ))}
            {profile.skills.length > 16 && (
              <span className="text-xs text-muted-foreground">
                +{profile.skills.length - 16} more
              </span>
            )}
          </div>
        </div>
      )}

      {profile.projects.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Projects
          </p>
          <div className="flex flex-col gap-1.5">
            {profile.projects.slice(0, 4).map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <span className="font-medium text-foreground">{p.name}</span>
                  {p.tech.length > 0 && (
                    <span className="ml-1 text-muted-foreground">
                      ({p.tech.slice(0, 3).join(", ")})
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
