import { createTheme, PaletteMode } from "@mui/material";

/**
 * Semantic tokens for the notebook surfaces. Components read these instead of
 * hard-coding colours, so light mode is a data change rather than a rewrite.
 */
export type NotebookPalette = {
  appBar: string;
  cell: string;
  cellSelected: string;
  cellBorder: string;
  editor: string;
  output: string;
  outputText: string;
  stderr: string;
  result: string;
  prompt: string;
  promptEmpty: string;
  markdown: string;
  accentAlt: string;
  scrollbar: string;
  /** Monaco ships its own themes; these are its built-in names. */
  monaco: "vs-dark" | "vs";
};

declare module "@mui/material/styles" {
  interface Palette {
    notebook: NotebookPalette;
  }
  interface PaletteOptions {
    notebook?: NotebookPalette;
  }
}

const DARK: NotebookPalette = {
  appBar: "rgba(10,10,15,0.85)",
  cell: "rgba(18,18,26,0.45)",
  cellSelected: "rgba(20,20,30,0.7)",
  cellBorder: "rgba(255,255,255,0.07)",
  editor: "#1e1e1e",
  output: "rgba(0,0,0,0.45)",
  outputText: "#e6e6e6",
  stderr: "#ff6b8a",
  result: "#00ff88",
  prompt: "rgba(255,0,255,0.55)",
  promptEmpty: "rgba(255,255,255,0.2)",
  markdown: "#00ff88",
  accentAlt: "#ff00ff",
  scrollbar: "rgba(0,255,255,0.25)",
  monaco: "vs-dark",
};

const LIGHT: NotebookPalette = {
  appBar: "rgba(255,255,255,0.9)",
  cell: "#ffffff",
  cellSelected: "#ffffff",
  cellBorder: "rgba(0,0,0,0.12)",
  editor: "#fffffe",
  output: "#f6f8fa",
  outputText: "#1f2328",
  stderr: "#b3261e",
  result: "#047857",
  prompt: "#8250df",
  promptEmpty: "rgba(0,0,0,0.28)",
  markdown: "#059669",
  accentAlt: "#9333ea",
  scrollbar: "rgba(0,0,0,0.22)",
  monaco: "vs",
};

/**
 * Neon reads well on black and disappears on white, so every language gets a
 * second, darker value for light mode.
 */
export const LANGUAGE_COLORS: Record<string, Record<PaletteMode, string>> = {
  python: { dark: "#00ffff", light: "#0e7490" },
  javascript: { dark: "#ffff00", light: "#a16207" },
  java: { dark: "#ff6600", light: "#c2410c" },
  cpp: { dark: "#00ff88", light: "#047857" },
};

export const languageColor = (language: string | undefined, mode: PaletteMode) =>
  LANGUAGE_COLORS[language ?? "python"]?.[mode] ?? LANGUAGE_COLORS.python[mode];

export const createNotebookTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      notebook: mode === "dark" ? DARK : LIGHT,
      ...(mode === "dark"
        ? {
            primary: { main: "#00ffff" },
            secondary: { main: "#00ff88" },
            error: { main: "#ff0066" },
            warning: { main: "#ffaa00" },
            background: { default: "#08080c", paper: "#0d0d14" },
          }
        : {
            primary: { main: "#0891b2" },
            secondary: { main: "#059669" },
            error: { main: "#dc2626" },
            warning: { main: "#b45309" },
            background: { default: "#f6f7f9", paper: "#ffffff" },
            text: { primary: "#1f2328", secondary: "#5b6470" },
          }),
    },
    typography: {
      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    },
    components: {
      MuiTooltip: {
        defaultProps: { enterDelay: 400 },
        styleOverrides: {
          tooltip: {
            fontSize: 11,
            backgroundColor: mode === "dark" ? "#1a1a24" : "#374151",
          },
        },
      },
    },
  });
