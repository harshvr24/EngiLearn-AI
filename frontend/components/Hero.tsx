"use client";

import { type Ref, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Atom,
  Boxes,
  Brain,
  ChevronDown,
  Cpu,
  Flame,
  Sigma,
  Sparkles,
} from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { WordsPullUp } from "./ui/words-pull-up";
import { TopicCard, type Topic } from "./TopicCard";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4";

const TOPICS: Topic[] = [
  {
    title: "Reinforcement Learning",
    blurb: "Agents, rewards, and policies that learn by trial and error.",
    Icon: Brain,
  },
  {
    title: "Linear Algebra",
    blurb: "Vectors, matrices, and the math that powers modern ML.",
    Icon: Sigma,
  },
  {
    title: "Quantum Computing",
    blurb: "Qubits, superposition, entanglement, and quantum algorithms.",
    Icon: Atom,
  },
  {
    title: "Data Structures",
    blurb: "Arrays, trees, graphs — and when to reach for each one.",
    Icon: Boxes,
  },
  {
    title: "Thermodynamics",
    blurb: "Heat, energy, entropy, and the laws that govern them.",
    Icon: Flame,
  },
  {
    title: "Neural Networks",
    blurb: "How deep-learning models represent and learn from data.",
    Icon: Cpu,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export function Hero({
  onSubmit,
  loading,
  searchRef,
}: {
  onSubmit: (topic: string) => void;
  loading: boolean;
  searchRef?: Ref<HTMLInputElement>;
}) {
  const [value, setValue] = useState("");

  function submit(raw: string) {
    const topic = raw.trim();
    if (!topic || loading) return;
    onSubmit(topic);
  }

  return (
    <section className="relative isolate overflow-hidden bg-slate-950">
      {/* Full-bleed background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        src={HERO_VIDEO}
      />
      {/* Overlays for legibility */}
      <div className="noise-overlay pointer-events-none absolute inset-0 -z-10 opacity-60 mix-blend-overlay" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/10 to-black/70" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-61px)] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5" /> Powered by multi-agent AI
        </motion.div>

        <h1 className="font-serif text-5xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-6xl">
          <WordsPullUp text="Learn anything," />
          <br />
          <WordsPullUp
            text="step by step."
            delay={0.2}
            className="text-sky-300"
          />
        </h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-5 max-w-xl text-base text-white/80 sm:text-lg"
        >
          Enter any technical topic. EngiLearn designs a personalized
          syllabus and teaches it to you, one concept at a time.
        </motion.p>

        <motion.form
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.65 }}
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}
          className="mt-8 flex w-full max-w-xl gap-2"
        >
          <Input
            ref={searchRef}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. Binary Search Trees"
            disabled={loading}
            className="h-12 border-white/25 bg-white/10 text-base text-white placeholder:text-white/60 backdrop-blur focus-visible:border-white/60 focus-visible:ring-white/30"
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
        </motion.form>

        <div className="mt-10 w-full">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-white/60">
            Or explore a popular topic
          </p>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.05, delayChildren: 0.55 },
              },
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {TOPICS.map((topic) => (
              <motion.div
                key={topic.title}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <TopicCard
                  topic={topic}
                  disabled={loading}
                  glass
                  onSelect={submit}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-5 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-1 text-white/70"
          >
            <span className="text-xs">See how it works</span>
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
