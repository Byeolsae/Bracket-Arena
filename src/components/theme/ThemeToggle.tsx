"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("bracket-arena-theme") as ThemeMode | null;
    const preferred =
      window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const nextTheme = saved ?? preferred;
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("bracket-arena-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <button className="icon-button h-10 w-10" onClick={toggleTheme} title="테마 전환">
      {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
