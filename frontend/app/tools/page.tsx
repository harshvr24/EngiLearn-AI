"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BookOpen, Code2, HelpCircle, Layers, Loader2, Network, Upload } from "lucide-react";

import { DocumentUpload } from "@/components/DocumentUpload";
import { FlashcardDeckView } from "@/components/flashcards/FlashcardDeck";
import { QuizSession } from "@/components/quiz/QuizSession";
import { CodeStepper } from "@/components/visual/CodeStepper";
import { MindMap } from "@/components/visual/MindMap";
import { Timeline } from "@/components/visual/Timeline";
import {
  generateCodeSteps,
  generateFlashcards,
  generateMindmap,
  generateQuestions,
  generateTimeline,
} from "@/lib/api";
import { initCards } from "@/lib/srs";
import { listDecks, saveDeck } from "@/lib/storage";
import type {
  CodeStepsData,
  FlashcardDeck,
  MindmapData,
  Question,
  TimelineData,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Panel = "upload" | "flashcards" | "quiz" | "visual";
type VisualTool = "mindmap" | "timeline" | "codesteps";

export default function ToolsPage() {
  const [panel, setPanel] = useState<Panel>("upload");
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizTopic, setQuizTopic] = useState("");
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  // Visual state
  const [visualTool, setVisualTool] = useState<VisualTool>("mindmap");
  const [visualInput, setVisualInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [mindmapData, setMindmapData] = useState<MindmapData | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [codeStepsData, setCodeStepsData] = useState<CodeStepsData | null>(null);

  const refreshDecks = useCallback(() => setDecks(listDecks()), []);

  useEffect(() => { refreshDecks(); }, [refreshDecks]);

  // ── Document handlers ──────────────────────────────────────────────────────

  async function handleGenerateFlashcards(title: string, text: string) {
    setGeneratingFlashcards(true);
    try {
      const cards = await generateFlashcards({ text, count: 15 });
      const srsCards = initCards(cards);
      const deck: FlashcardDeck = {
        id: `doc-${Date.now()}`,
        name: title,
        source: title,
        createdAt: Date.now(),
        cards: srsCards,
      };
      saveDeck(deck);
      refreshDecks();
      setPanel("flashcards");
      toast.success(`Created deck: ${title}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Flashcard generation failed.");
    } finally {
      setGeneratingFlashcards(false);
    }
  }

  async function handleGenerateQuiz(title: string, text: string) {
    setGeneratingQuiz(true);
    try {
      const questions = await generateQuestions({ text, types: ["mcq", "short"], count: 10 });
      setQuizQuestions(questions);
      setQuizTopic(title);
      setPanel("quiz");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Quiz generation failed.");
    } finally {
      setGeneratingQuiz(false);
    }
  }

  function handleGenerateSyllabus(_title: string, _text: string) {
    toast("Use this document text in the Home tab search to start a course.", { icon: "📄" });
  }

  // ── Visual handlers ────────────────────────────────────────────────────────

  async function handleGenerateVisual() {
    if (!visualInput.trim() && !codeInput.trim()) {
      toast.error("Enter a topic or code snippet first.");
      return;
    }
    setGeneratingVisual(true);
    try {
      if (visualTool === "mindmap") {
        const data = await generateMindmap({ topic: visualInput.trim() || undefined });
        setMindmapData(data);
      } else if (visualTool === "timeline") {
        const data = await generateTimeline(visualInput.trim());
        setTimelineData(data);
      } else {
        const data = await generateCodeSteps({
          algorithm: visualInput.trim() || undefined,
          code: codeInput.trim() || undefined,
        });
        setCodeStepsData(data);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Visual generation failed.");
    } finally {
      setGeneratingVisual(false);
    }
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const tabs: { id: Panel; label: string; icon: React.ReactNode }[] = [
    { id: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
    { id: "flashcards", label: `Flashcards (${decks.length})`, icon: <Layers className="h-4 w-4" /> },
    { id: "quiz", label: "Quiz", icon: <HelpCircle className="h-4 w-4" /> },
    { id: "visual", label: "Visual", icon: <Network className="h-4 w-4" /> },
  ];

  const visualSubTabs: { id: VisualTool; label: string; icon: React.ReactNode }[] = [
    { id: "mindmap", label: "Mind Map", icon: <Network className="h-3.5 w-3.5" /> },
    { id: "timeline", label: "Timeline", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: "codesteps", label: "Code Stepper", icon: <Code2 className="h-3.5 w-3.5" /> },
  ];

  const currentResult =
    visualTool === "mindmap" ? mindmapData :
    visualTool === "timeline" ? timelineData :
    codeStepsData;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-foreground">Learning Tools</h1>
        <p className="mt-1 text-muted-foreground">
          Upload documents, generate flashcards, take quizzes, and explore visual learning aids.
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPanel(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              panel === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Panel: Upload */}
      {panel === "upload" && (
        <div className="flex flex-col gap-6">
          <DocumentUpload
            onGenerateSyllabus={handleGenerateSyllabus}
            onGenerateFlashcards={(title, text) => void handleGenerateFlashcards(title, text)}
            onGenerateQuiz={(title, text) => void handleGenerateQuiz(title, text)}
          />
          {(generatingFlashcards || generatingQuiz) && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4 animate-pulse text-primary" />
              {generatingFlashcards ? "Generating flashcards…" : "Generating quiz questions…"}
            </div>
          )}
        </div>
      )}

      {/* Panel: Flashcards */}
      {panel === "flashcards" && (
        <FlashcardDeckView
          decks={decks}
          onDecksChange={setDecks}
          onCreateDeck={() => setPanel("upload")}
        />
      )}

      {/* Panel: Quiz */}
      {panel === "quiz" && quizQuestions.length > 0 ? (
        <QuizSession
          questions={quizQuestions}
          topic={quizTopic}
          onClose={() => setQuizQuestions([])}
          onDecksCreated={refreshDecks}
        />
      ) : panel === "quiz" ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <HelpCircle className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-foreground">No quiz loaded</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a document and click &ldquo;Generate Quiz&rdquo; to start.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPanel("upload")}
            className="text-sm font-medium text-primary hover:underline"
          >
            Go to Document Upload
          </button>
        </div>
      ) : null}

      {/* Panel: Visual Tools */}
      {panel === "visual" && (
        <div className="flex flex-col gap-6">
          {/* Sub-tabs */}
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {visualSubTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setVisualTool(tab.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  visualTool === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            {visualTool === "codesteps" ? (
              <>
                <label className="text-sm font-medium text-foreground">
                  Algorithm name <span className="text-muted-foreground">(e.g. "Binary Search")</span>
                </label>
                <input
                  type="text"
                  value={visualInput}
                  onChange={(e) => setVisualInput(e.target.value)}
                  placeholder="Algorithm name…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <label className="text-sm font-medium text-foreground">
                  Or paste code <span className="text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  rows={5}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="def binary_search(arr, target): …"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-foreground">
                  {visualTool === "mindmap"
                    ? "Topic for mind map"
                    : "Topic for timeline"}
                </label>
                <input
                  type="text"
                  value={visualInput}
                  onChange={(e) => setVisualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleGenerateVisual();
                  }}
                  placeholder={
                    visualTool === "mindmap"
                      ? "e.g. Machine Learning"
                      : "e.g. History of the Internet"
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </>
            )}

            <Button
              onClick={() => void handleGenerateVisual()}
              disabled={generatingVisual}
              className="self-start gap-2"
            >
              {generatingVisual ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  {visualTool === "mindmap" && <Network className="h-4 w-4" />}
                  {visualTool === "timeline" && <BookOpen className="h-4 w-4" />}
                  {visualTool === "codesteps" && <Code2 className="h-4 w-4" />}
                  Generate {visualTool === "mindmap" ? "Mind Map" : visualTool === "timeline" ? "Timeline" : "Code Steps"}
                </>
              )}
            </Button>
          </div>

          {/* Result */}
          {visualTool === "mindmap" && mindmapData && (
            <div className="h-[520px] overflow-hidden rounded-xl border border-border bg-card">
              <MindMap data={mindmapData} />
            </div>
          )}

          {visualTool === "timeline" && timelineData && (
            <Timeline data={timelineData} />
          )}

          {visualTool === "codesteps" && codeStepsData && (
            <CodeStepper data={codeStepsData} />
          )}

          {!currentResult && !generatingVisual && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              {visualTool === "mindmap" && <Network className="h-12 w-12 text-muted-foreground/30" />}
              {visualTool === "timeline" && <BookOpen className="h-12 w-12 text-muted-foreground/30" />}
              {visualTool === "codesteps" && <Code2 className="h-12 w-12 text-muted-foreground/30" />}
              <p className="text-sm text-muted-foreground">
                {visualTool === "mindmap"
                  ? "Enter a topic above to generate an interactive mind map."
                  : visualTool === "timeline"
                    ? "Enter a topic to generate a scrollable timeline."
                    : "Enter an algorithm name or paste code to get a step-by-step trace."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
