"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-full bg-slate-200/20 dark:bg-zinc-800/20 border border-slate-200/30 dark:border-zinc-800/30 animate-pulse" />
    );
  }

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative w-9 h-9 rounded-full flex items-center justify-center bg-white/50 dark:bg-white/5 border border-slate-200/40 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.02)] active:scale-95 cursor-pointer"
      aria-label="Toggle theme"
      title={`Current theme: ${theme || 'system'}. Click to cycle.`}
    >
      {theme === "light" && <Sun className="w-4.5 h-4.5 text-[#5B7C99]" />}
      {theme === "dark" && <Moon className="w-4.5 h-4.5 text-sky-400" />}
      {theme === "system" && <Monitor className="w-4.5 h-4.5 text-slate-500 dark:text-zinc-400" />}
    </button>
  );
}
