"use client";

import { GraduationCap, PanelLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";
import { Button } from "./ui/button";

export type Tab = "home" | "courses" | "tools" | "interview" | "dashboard";

export function Header({
  activeTab,
  onTabChange,
  onHome,
  onToggleSidebar,
  showMenu,
}: {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
  onHome?: () => void;
  onToggleSidebar?: () => void;
  showMenu?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {showMenu && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              aria-label="Toggle course list"
              className="lg:hidden"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          )}
          <button
            type="button"
            onClick={onHome}
            aria-label="Go to home"
            className="flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="hidden text-left sm:block">
              <div className="font-serif text-lg font-semibold leading-none text-foreground">
                EngiLearn AI
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Your adaptive AI instructor
              </div>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onTabChange && (
            <nav className="flex items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-muted/50 p-0.5 text-sm">
              {(
                ["home", "courses", "tools", "interview", "dashboard"] as const
              ).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onTabChange(tab)}
                  className={cn(
                    "whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium transition-colors",
                    activeTab === tab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab === "home"
                    ? "Home"
                    : tab === "courses"
                      ? "Courses"
                      : tab === "tools"
                        ? "Tools"
                        : tab === "interview"
                          ? "Interview"
                          : "Dashboard"}
                </button>
              ))}
            </nav>
          )}
          <AnimatedThemeToggler />
        </div>
      </div>
    </header>
  );
}
