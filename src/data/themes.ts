import { Theme } from "@/types/theme";

export const themes: Theme[] = [
  {
    id: "default",
    name: "Fractal",
    description: "Светлая и тёмная тема",
    colors: {
      light: {
        background: "220 30% 96%",
        foreground: "220 20% 15%",
        card: "0 0% 100%",
        cardForeground: "220 20% 15%",
        popover: "0 0% 100%",
        popoverForeground: "220 20% 15%",
        primary: "0 84% 60%",
        primaryForeground: "0 0% 100%",
        secondary: "220 15% 95%",
        secondaryForeground: "220 20% 25%",
        muted: "220 15% 92%",
        mutedForeground: "220 10% 40%",
        accent: "262 83% 58%",
        accentForeground: "0 0% 100%",
        destructive: "0 84% 60%",
        destructiveForeground: "0 0% 100%",
        border: "220 15% 85%",
        input: "220 15% 85%",
        ring: "0 84% 60%",
      },
      dark: {
        background: "222 20% 10%",
        foreground: "220 15% 92%",
        card: "222 18% 14%",
        cardForeground: "220 15% 92%",
        popover: "222 18% 14%",
        popoverForeground: "220 15% 92%",
        primary: "0 84% 60%",
        primaryForeground: "0 0% 100%",
        secondary: "222 15% 18%",
        secondaryForeground: "220 15% 85%",
        muted: "222 15% 16%",
        mutedForeground: "220 10% 55%",
        accent: "262 70% 60%",
        accentForeground: "0 0% 100%",
        destructive: "0 84% 60%",
        destructiveForeground: "0 0% 100%",
        border: "222 15% 20%",
        input: "222 15% 20%",
        ring: "0 84% 60%",
      },
    },
    gradients: {
      light: {
        primary: "linear-gradient(135deg, hsl(0 84% 60%), hsl(0 74% 52%))",
        card: "linear-gradient(180deg, hsl(0 0% 100%), hsl(220 30% 98%))",
      },
      dark: {
        primary: "linear-gradient(135deg, hsl(0 84% 52%), hsl(0 74% 45%))",
        card: "linear-gradient(180deg, hsl(222 18% 14%), hsl(222 18% 12%))",
      },
    },
    shadows: {
      light: {
        card: "0 2px 8px rgba(0, 0, 0, 0.08)",
        cardHover: "0 8px 24px rgba(0, 0, 0, 0.12)",
      },
      dark: {
        card: "0 2px 8px rgba(0, 0, 0, 0.4)",
        cardHover: "0 8px 24px rgba(0, 0, 0, 0.5)",
      },
    },
    radius: "0.75rem",
  },
];
