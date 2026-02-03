export interface ColorScheme {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface GradientScheme {
  primary: string;
  card: string;
}

export interface ShadowScheme {
  card: string;
  cardHover: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    light: ColorScheme;
    dark: ColorScheme;
  };
  gradients: {
    light: GradientScheme;
    dark: GradientScheme;
  };
  shadows: {
    light: ShadowScheme;
    dark: ShadowScheme;
  };
  radius: string;
}
