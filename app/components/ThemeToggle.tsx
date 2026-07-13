import { useEffect, useState } from "react";
import { Icon } from "~/components/Icon";
import { commitTheme, cycleTheme, isTheme, THEME_CHANGE_EVENT, type Theme } from "~/lib/theme";

const SLOTS: { theme: Theme; icon: "sun" | "desktop" | "moon"; label: string }[] = [
  { theme: "light", icon: "sun", label: "Light" },
  { theme: "system", icon: "desktop", label: "System" },
  { theme: "dark", icon: "moon", label: "Dark" },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const initial = typeof document !== "undefined" ? document.documentElement.dataset.theme : undefined;
    return isTheme(initial) ? initial : "system";
  });

  useEffect(() => {
    function handleThemeChange(event: Event) {
      const next = (event as CustomEvent<{ theme: Theme }>).detail?.theme;
      if (isTheme(next)) setTheme(next);
    }

    document.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    return () => document.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  }, []);

  function handleClick() {
    const next = cycleTheme(theme);
    commitTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      aria-label={`Switch theme (currently ${SLOTS.find((slot) => slot.theme === theme)?.label ?? "system"})`}
      onClick={handleClick}
      className="inline-flex items-center rounded-full border border-border p-0.5"
    >
      {SLOTS.map((slot) => (
        <span
          key={slot.theme}
          className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
            theme === slot.theme
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          }`}
        >
          {theme === slot.theme && <Icon name={slot.icon} size={16} />}
        </span>
      ))}
    </button>
  );
}
