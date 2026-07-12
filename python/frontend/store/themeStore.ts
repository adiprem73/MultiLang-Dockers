"use client";

import { create } from "zustand";
import { PaletteMode } from "@mui/material";

const STORAGE_KEY = "codenotebook:theme";

type ThemeStore = {
  mode: PaletteMode;
  /** False until the client has read the stored preference. */
  hydrated: boolean;
  setMode: (mode: PaletteMode) => void;
  toggleMode: () => void;
  hydrate: () => void;
};

const applyToDocument = (mode: PaletteMode) => {
  // globals.css keys the ambient background off this attribute.
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  // The server has no way to know the preference, so it renders dark and the
  // client corrects it on mount. Keeping this in sync avoids a hydration error.
  mode: "dark",
  hydrated: false,

  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    applyToDocument(mode);
    set({ mode });
  },

  toggleMode: () => get().setMode(get().mode === "dark" ? "light" : "dark"),

  hydrate: () => {
    const stored = localStorage.getItem(STORAGE_KEY);

    const mode: PaletteMode =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";

    applyToDocument(mode);
    set({ mode, hydrated: true });
  },
}));
