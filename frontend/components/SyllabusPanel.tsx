"use client";

import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { CopyButton } from "./CopyButton";
import { Markdown } from "./Markdown";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function SyllabusPanel({
  syllabus,
  onRegenerate,
  regenerating,
}: {
  syllabus: string | null;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader>
        <CardTitle>Syllabus</CardTitle>
        <div className="flex items-center gap-1">
          {syllabus && <CopyButton text={syllabus} />}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            disabled={regenerating}
            className="text-muted-foreground"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", regenerating && "animate-spin")}
            />
            Regenerate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="scroll-thin flex-1 overflow-y-auto">
        {syllabus ? (
          <Markdown content={syllabus} />
        ) : (
          <SyllabusSkeleton />
        )}
      </CardContent>
    </Card>
  );
}

function SyllabusSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-2/3" />
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i % 3 === 0 ? "w-1/2" : "w-full")}
        />
      ))}
    </div>
  );
}
