"use client";

import { GraduationCap } from "lucide-react";

import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CopyButton } from "./CopyButton";
import { Markdown } from "./Markdown";

export function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: Role;
  content: string;
  streaming?: boolean;
}) {
  if (role === "human") {
    return (
      <div className="flex animate-fade-in justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <GraduationCap className="h-4 w-4" />
      </div>
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-sm">
        <Markdown
          content={content}
          className={cn(streaming && "streaming-caret")}
        />
        {!streaming && content && (
          <div className="-mb-1 mt-1 flex justify-end">
            <CopyButton text={content} />
          </div>
        )}
      </div>
    </div>
  );
}
