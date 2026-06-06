"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, Send } from "lucide-react";

import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";

export function ChatPanel({
  messages,
  isStreaming,
  busy,
  onSend,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  busy: boolean;
  onSend: (message: string) => void;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  function send() {
    const message = text.trim();
    if (!message || busy) return;
    onSend(message);
    setText("");
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <GraduationCap className="h-4 w-4 text-primary" />
        <span className="font-serif text-lg font-semibold text-card-foreground">
          Lesson
        </span>
      </div>
      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            role={m.role}
            content={m.content}
            streaming={
              isStreaming &&
              i === messages.length - 1 &&
              m.role === "instructor"
            }
          />
        ))}
        {busy && !isStreaming && <ThinkingIndicator />}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              busy
                ? "Instructor is responding…"
                : "Ask a question, or type 'continue'…"
            }
            disabled={busy}
            className="max-h-32 min-h-[44px]"
          />
          <Button
            size="icon"
            onClick={send}
            disabled={busy || !text.trim()}
            className="h-11 w-11 shrink-0"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 pl-11 text-sm text-muted-foreground">
      <span className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50"
          style={{ animationDelay: "0.15s" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50"
          style={{ animationDelay: "0.3s" }}
        />
      </span>
      Instructor is thinking…
    </div>
  );
}
