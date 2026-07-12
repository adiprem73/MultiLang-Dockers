"use client";

import { useEffect, useMemo } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";

import { createNotebookTheme } from "@/lib/theme";
import { useThemeStore } from "@/store/themeStore";
import MuiRegistry from "./MuiRegistry";

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = useThemeStore((state) => state.mode);
  const hydrate = useThemeStore((state) => state.hydrate);

  // Reading localStorage during render would desync the server-rendered HTML,
  // so the stored preference is adopted right after mount instead.
  useEffect(() => hydrate(), [hydrate]);

  const theme = useMemo(() => createNotebookTheme(mode), [mode]);

  return (
    <MuiRegistry>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </MuiRegistry>
  );
}
