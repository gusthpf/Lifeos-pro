import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "lc-theme";

function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = (checked: boolean) => {
    const next = checked ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-border bg-card/60 px-2.5 py-1.5 backdrop-blur"
      title={theme === "dark" ? "Modo escuro" : "Modo claro"}
    >
      <Sun
        className={`h-3.5 w-3.5 transition-colors ${
          theme === "light" ? "text-accent" : "text-muted-foreground"
        }`}
      />
      <Switch
        checked={theme === "dark"}
        onCheckedChange={toggle}
        aria-label="Alternar tema"
      />
      <Moon
        className={`h-3.5 w-3.5 transition-colors ${
          theme === "dark" ? "text-primary" : "text-muted-foreground"
        }`}
      />
    </div>
  );
}
