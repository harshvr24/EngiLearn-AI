"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { ChatPanel } from "@/components/ChatPanel";
import { Header, type Tab } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ScrollBook } from "@/components/ScrollBook";
import { SessionsSidebar } from "@/components/SessionsSidebar";
import { SyllabusPanel } from "@/components/SyllabusPanel";
import { TopicInput } from "@/components/TopicInput";
import ToolsPage from "@/app/tools/page";
import InterviewPage from "@/app/interview/page";
import DashboardPage from "@/app/dashboard/page";
import { createSyllabus, fetchHistory, streamChat } from "@/lib/api";
import {
  getCurrentId,
  listSessions,
  recordStudyDay,
  removeSession,
  setCurrentId as storeCurrentId,
  upsertProgress,
  upsertSession,
} from "@/lib/storage";
import type { ChatMessage, StoredSession } from "@/lib/types";

type Phase = "idle" | "generating" | "learning";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [phase, setPhase] = useState<Phase>("idle");
  const [topic, setTopic] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [syllabus, setSyllabus] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const refreshSessions = useCallback(() => {
    setSessions(listSessions());
  }, []);

  /** Stream one instructor turn for a known session id. */
  const runInstructorTurn = useCallback(
    async (sid: string, userMessage: string) => {
      // Record study activity (no-op if already counted today)
      recordStudyDay();
      setIsStreaming(true);
      setMessages((prev) => {
        const next = [...prev];
        if (userMessage) next.push({ role: "human", content: userMessage });
        next.push({ role: "instructor", content: "" });
        return next;
      });

      try {
        await streamChat({
          sessionId: sid,
          message: userMessage,
          onToken: (tok) => {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === "instructor") {
                const raw = last.content + tok;
                next[next.length - 1] = {
                  ...last,
                  content: raw.replaceAll("<END_OF_TURN>", ""),
                };
              }
              return next;
            });
          },
        });
        // Increment lesson count for this topic in progress store
        if (topic) {
          const today = new Date().toISOString().split("T")[0];
          upsertProgress(topic, { lastStudied: today });
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "The lesson stream failed.",
        );
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "instructor" && !last.content) {
            next.pop();
          }
          return next;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [topic],
  );

  /** Open a stored course: show its syllabus and load its history. */
  const openSession = useCallback(
    (session: StoredSession) => {
      setCurrentId(session.session_id);
      storeCurrentId(session.session_id);
      setTopic(session.topic);
      setSyllabus(session.syllabus || null);
      setMessages([]);
      setPhase("learning");
      setSidebarOpen(false);
      fetchHistory(session.session_id)
        .then((h) => {
          const msgs = h.messages.map((m) => ({
            role: m.role,
            content: m.content,
          }));
          setMessages(msgs);
          if (msgs.length === 0) void runInstructorTurn(session.session_id, "");
        })
        .catch(() => {
          /* backend down or session gone; keep the syllabus we have */
        });
    },
    [runInstructorTurn],
  );

  // Rehydrate the sessions list + last open course on first load.
  useEffect(() => {
    const list = listSessions();
    setSessions(list);
    const cur = getCurrentId();
    const stored = cur ? list.find((s) => s.session_id === cur) : undefined;
    if (stored) {
      openSession(stored);
      setActiveTab("courses");
    }
  }, [openSession]);

  async function handleSubmit(nextTopic: string) {
    setPhase("generating");
    setTopic(nextTopic);
    setSyllabus(null);
    setMessages([]);
    setCurrentId(null);
    setSidebarOpen(false);
    try {
      const res = await createSyllabus(nextTopic);
      const stored: StoredSession = {
        session_id: res.session_id,
        topic: res.topic,
        syllabus: res.syllabus,
        created_at: Date.now(),
      };
      upsertSession(stored);
      storeCurrentId(res.session_id);
      refreshSessions();
      setCurrentId(res.session_id);
      setSyllabus(res.syllabus);
      setPhase("learning");
      void runInstructorTurn(res.session_id, "");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Couldn't reach the backend. Is it running on :8000?",
      );
      setPhase("idle");
    }
  }

  /** Start a topic from the home hero → jump into the course view. */
  function handleStartTopic(nextTopic: string) {
    setActiveTab("courses");
    void handleSubmit(nextTopic);
  }

  async function handleRegenerate() {
    if (!topic || !currentId || regenerating || isStreaming) return;
    setRegenerating(true);
    setSyllabus(null);
    setMessages([]);
    const oldId = currentId;
    try {
      const res = await createSyllabus(topic);
      removeSession(oldId);
      const stored: StoredSession = {
        session_id: res.session_id,
        topic: res.topic,
        syllabus: res.syllabus,
        created_at: Date.now(),
      };
      upsertSession(stored);
      storeCurrentId(res.session_id);
      refreshSessions();
      setCurrentId(res.session_id);
      setSyllabus(res.syllabus);
      void runInstructorTurn(res.session_id, "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regenerate failed.");
    } finally {
      setRegenerating(false);
    }
  }

  function handleSend(message: string) {
    if (!currentId) return;
    void runInstructorTurn(currentId, message);
  }

  /** Start a brand-new course (sidebar "New course"). */
  function handleNewCourse() {
    storeCurrentId(null);
    setCurrentId(null);
    setPhase("idle");
    setTopic("");
    setSyllabus(null);
    setMessages([]);
    setIsStreaming(false);
    setSidebarOpen(false);
    setActiveTab("courses");
  }

  function goHome() {
    setSidebarOpen(false);
    setActiveTab("home");
  }

  /** Book CTA → return to the hero search, focused and ready to type. */
  function handleStartFromBook() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 650);
  }

  function handleTabChange(tab: Tab) {
    setSidebarOpen(false);
    setActiveTab(tab);
    if (tab === "courses" && !currentId && sessions.length > 0) {
      openSession(sessions[0]);
    }
  }

  function handleSelect(id: string) {
    if (id === currentId) {
      setSidebarOpen(false);
      return;
    }
    const session = sessions.find((s) => s.session_id === id);
    if (session) openSession(session);
  }

  function handleDelete(id: string) {
    removeSession(id);
    const remaining = listSessions();
    setSessions(remaining);
    if (id === currentId) {
      if (remaining.length > 0) openSession(remaining[0]);
      else handleNewCourse();
    }
  }

  const chatBusy = phase === "generating" || regenerating || isStreaming;

  return (
    <main className="min-h-dvh">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onHome={goHome}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        showMenu={activeTab === "courses"}
      />

      {activeTab === "home" ? (
        <>
          <Hero
            onSubmit={handleStartTopic}
            loading={phase === "generating"}
            searchRef={searchRef}
          />
          <ScrollBook onStart={handleStartFromBook} />
        </>
      ) : activeTab === "tools" ? (
        <ToolsPage />
      ) : activeTab === "interview" ? (
        <InterviewPage />
      ) : activeTab === "dashboard" ? (
        <DashboardPage />
      ) : (
        <div className="lg:grid lg:h-[calc(100dvh-61px)] lg:grid-cols-[15rem_minmax(0,1fr)]">
          {/* Sidebar — column on desktop */}
          <aside className="hidden lg:block lg:h-full">
            <SessionsSidebar
              sessions={sessions}
              currentId={currentId}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onNew={handleNewCourse}
            />
          </aside>

          {/* Sidebar — slide-over drawer on mobile */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-30 lg:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full w-72 shadow-xl">
                <SessionsSidebar
                  sessions={sessions}
                  currentId={currentId}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onNew={handleNewCourse}
                />
              </div>
            </div>
          )}

          {/* Main area */}
          <div className="lg:h-full lg:overflow-hidden">
            {phase === "idle" ? (
              <TopicInput onSubmit={handleSubmit} loading={false} />
            ) : (
              <div className="grid h-full gap-4 px-4 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <section className="h-[42vh] min-h-0 lg:h-auto">
                  <div className="mb-2 px-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {phase === "generating"
                        ? "Designing your syllabus…"
                        : "Course"}
                    </p>
                    <h1 className="truncate font-serif text-xl font-semibold text-foreground">
                      {topic}
                    </h1>
                  </div>
                  <div className="h-[calc(42vh-3.5rem)] lg:h-[calc(100%-3.5rem)]">
                    <SyllabusPanel
                      syllabus={syllabus}
                      onRegenerate={handleRegenerate}
                      regenerating={regenerating}
                    />
                  </div>
                </section>

                <section className="h-[60vh] min-h-0 lg:h-full">
                  <ChatPanel
                    messages={messages}
                    isStreaming={isStreaming}
                    busy={chatBusy}
                    onSend={handleSend}
                  />
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
