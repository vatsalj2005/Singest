"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function getInitial(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function apply(theme: Theme) {
  const html = document.documentElement;
  html.classList.toggle("light", theme === "light");
  html.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("singest-theme", theme);
  } catch {
    // Ignore errors caused by restricted localStorage access (e.g., in Safari private mode or sandboxed iframes).
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getInitial());
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggle}
      className="relative grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-card/60 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/50"
    >
      <Sun
        className={`h-4 w-4 transition-all duration-300 ${
          mounted && theme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
      <Moon
        className={`absolute h-4 w-4 transition-all duration-300 ${
          mounted && theme === "light"
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
