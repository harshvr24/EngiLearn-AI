"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Brain,
  FileText,
  HelpCircle,
  Layers,
  Upload,
  X,
} from "lucide-react";

import type { DocumentExtract } from "@/lib/types";
import { uploadDocument } from "@/lib/api";
import { Button } from "./ui/button";

interface Props {
  onGenerateSyllabus: (title: string, text: string) => void;
  onGenerateFlashcards: (title: string, text: string) => void;
  onGenerateQuiz: (title: string, text: string) => void;
}

const ACCEPTED = ".pdf,.docx,.pptx";

export function DocumentUpload({
  onGenerateSyllabus,
  onGenerateFlashcards,
  onGenerateQuiz,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentExtract | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setError(null);
    setResult(null);
    setUploading(true);
    try {
      const extract = await uploadDocument(file);
      setResult(extract);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    void processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function reset() {
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (result) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">{result.title}</p>
                <p className="text-sm text-muted-foreground">
                  {result.page_count} page{result.page_count !== 1 ? "s" : ""} ·{" "}
                  {(result.text.length / 1000).toFixed(1)}k characters extracted
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Text preview */}
          <div className="max-h-32 overflow-y-auto rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            {result.text.slice(0, 400)}
            {result.text.length > 400 && "…"}
          </div>

          {/* Action buttons */}
          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => onGenerateSyllabus(result.title, result.text)}
            >
              <BookOpen className="h-4 w-4" />
              Generate Syllabus
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => onGenerateFlashcards(result.title, result.text)}
            >
              <Layers className="h-4 w-4" />
              Generate Flashcards
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => onGenerateQuiz(result.title, result.text)}
            >
              <HelpCircle className="h-4 w-4" />
              Generate Quiz
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-12 transition-all ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {uploading ? (
            <Brain className="h-7 w-7 animate-pulse" />
          ) : (
            <Upload className="h-7 w-7" />
          )}
        </div>

        <div className="text-center">
          <p className="font-semibold text-foreground">
            {uploading ? "Parsing document…" : "Drop your file here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse · PDF, DOCX, PPTX up to 20 MB
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
