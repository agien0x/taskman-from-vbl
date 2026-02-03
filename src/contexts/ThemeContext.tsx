import React, { createContext, useContext, useState, useEffect } from "react";
import { Theme } from "@/types/theme";
import { themes } from "@/data/themes";

interface ThemeContextType {
  currentTheme: Theme;
  isDark: boolean;
  setThemeById: (themeId: string) => void;
  toggleDarkMode: () => void;
  allThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);
  const [isDark, setIsDark] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem("theme-id");
    const savedDarkMode = localStorage.getItem("theme-dark-mode");

    if (savedThemeId) {
      const theme = themes.find((t) => t.id === savedThemeId);
      if (theme) setCurrentTheme(theme);
    }

    if (savedDarkMode !== null) {
      setIsDark(savedDarkMode === "true");
    }
  }, []);

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const colorScheme = isDark ? currentTheme.colors.dark : currentTheme.colors.light;
    const gradients = isDark ? currentTheme.gradients.dark : currentTheme.gradients.light;
    const shadows = isDark ? currentTheme.shadows.dark : currentTheme.shadows.light;

    // Apply colors
    Object.entries(colorScheme).forEach(([key, value]) => {
      const cssVarName = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      root.style.setProperty(`--${cssVarName}`, value);
    });

    // Apply gradients
    root.style.setProperty("--gradient-primary", gradients.primary);
    root.style.setProperty("--gradient-card", gradients.card);

    // Apply shadows
    root.style.setProperty("--shadow-card", shadows.card);
    root.style.setProperty("--shadow-card-hover", shadows.cardHover);

    // Apply radius
    root.style.setProperty("--radius", currentTheme.radius);

    // Apply transition
    root.style.setProperty("--transition-smooth", "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)");

    // Toggle dark class
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [currentTheme, isDark]);

  const setThemeById = (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem("theme-id", themeId);
    }
  };

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const newValue = !prev;
      localStorage.setItem("theme-dark-mode", String(newValue));
      return newValue;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        isDark,
        setThemeById,
        toggleDarkMode,
        allThemes: themes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
