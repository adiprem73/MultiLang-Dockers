"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Snackbar,
  Typography,
  useTheme,
} from "@mui/material";

import { supabase } from "@/lib/supabase";
import { useNotebookStore } from "@/store/notebookStore";
import { focusEditor } from "@/lib/editorRegistry";

import Navbar from "./Navbar";
import CodeCell from "./CodeCell";
import MarkdownCell from "./MarkdownCell";
import ShortcutsDialog from "./ShortcutsDialog";
import AddCellDivider from "./AddCellDivider";

/** True when the keystroke belongs to a text field rather than the notebook. */
const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;

  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable ||
    Boolean(element.closest?.(".monaco-editor"))
  );
};

export default function Notebook() {
  const router = useRouter();
  const theme = useTheme();
  const [authChecked, setAuthChecked] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // For the two-key "D,D" delete chord.
  const lastKey = useRef<{ key: string; at: number }>({ key: "", at: 0 });

  const notebooks = useNotebookStore((state) => state.notebooks);
  const activeNotebookId = useNotebookStore((state) => state.activeNotebookId);
  const selectedCellId = useNotebookStore((state) => state.selectedCellId);
  const mode = useNotebookStore((state) => state.mode);
  const isLoading = useNotebookStore((state) => state.isLoading);
  const error = useNotebookStore((state) => state.error);
  const setError = useNotebookStore((state) => state.setError);
  const loadNotebooks = useNotebookStore((state) => state.loadNotebooks);

  const notebook = notebooks.find((entry) => entry.id === activeNotebookId);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setAuthChecked(true);
      loadNotebooks();
    });

    return () => {
      cancelled = true;
    };
  }, [router, loadNotebooks]);

  const handleKeyDown = useCallback(
    async (event: KeyboardEvent) => {
      const store = useNotebookStore.getState();
      const cellId = store.selectedCellId;

      // Ctrl/Cmd+S is a save gesture everywhere; we already autosave, so just
      // stop the browser from offering to save the HTML page.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        return;
      }

      // In edit mode the editor owns the keyboard (Monaco registers its own
      // run/escape commands); only the textarea-based markdown cell needs help,
      // and it handles its own keys.
      if (store.mode === "edit" || isTypingTarget(event.target)) return;

      const key = event.key;
      const now = Date.now();
      const previous = lastKey.current;
      lastKey.current = { key, at: now };

      const withCell = (handler: (id: string) => void) => {
        if (!cellId) return;
        event.preventDefault();
        handler(cellId);
      };

      if (key === "Enter") {
        if (event.shiftKey) {
          withCell((id) => store.runAndAdvance(id));
        } else if (event.ctrlKey || event.metaKey) {
          withCell((id) => store.runCell(id));
        } else if (event.altKey) {
          withCell((id) => store.runAndInsertBelow(id));
        } else {
          // Plain Enter drops into the selected cell.
          withCell((id) => {
            store.setMode("edit");
            focusEditor(id);
          });
        }
        return;
      }

      // Everything below is a bare key. Without this guard, Ctrl+A would insert
      // a cell instead of selecting all, and Ctrl+C would copy the cell instead
      // of the text.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      switch (key) {
        case "ArrowUp":
        case "k":
          event.preventDefault();
          store.selectRelative(-1);
          return;

        case "ArrowDown":
        case "j":
          event.preventDefault();
          store.selectRelative(1);
          return;

        case "a":
          withCell((id) => store.addCellRelative(id, "code", "above"));
          return;

        case "b":
          withCell((id) => store.addCellRelative(id, "code", "below"));
          return;

        case "m":
          withCell((id) => store.setCellType(id, "markdown"));
          return;

        case "y":
          withCell((id) => store.setCellType(id, "code"));
          return;

        case "d":
          // D,D within a moment of each other — Jupyter's delete chord.
          if (previous.key === "d" && now - previous.at < 600) {
            lastKey.current = { key: "", at: 0 };
            withCell((id) => store.deleteCell(id));
          }
          return;

        case "z":
          event.preventDefault();
          store.undoDeleteCell();
          return;

        case "c":
          withCell((id) => store.copyCell(id));
          return;

        case "x":
          withCell((id) => store.cutCell(id));
          return;

        case "v":
          event.preventDefault();
          store.pasteCell();
          return;

        case "o":
          withCell((id) => store.clearOutput(id));
          return;

        case "0":
          // 0,0 restarts the kernel, same as Jupyter.
          if (previous.key === "0" && now - previous.at < 600) {
            lastKey.current = { key: "", at: 0 };
            event.preventDefault();
            store.restartKernel();
          }
          return;

        case "i":
          if (previous.key === "i" && now - previous.at < 600) {
            lastKey.current = { key: "", at: 0 };
            event.preventDefault();
            store.interruptKernel();
          }
          return;

        case "h":
          event.preventDefault();
          setShortcutsOpen(true);
          return;

        case "Escape":
          event.preventDefault();
          store.setMode("command");
          return;
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!authChecked || isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress sx={{ color: "primary.main" }} />
        <Typography
          sx={{ color: "text.secondary", letterSpacing: 2, fontSize: 12 }}
        >
          {!authChecked ? "AUTHENTICATING…" : "LOADING NOTEBOOKS…"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar onShowShortcuts={() => setShortcutsOpen(true)} />

      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          px: 2,
          py: 3,
          "&::-webkit-scrollbar": { width: 10 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: theme.palette.notebook.scrollbar,
            borderRadius: 5,
          },
        }}
      >
        <Container maxWidth="lg" disableGutters>
          {notebook?.cells.map((cell, index) => (
            <Box key={cell.id}>
              <AddCellDivider index={index} />

              {cell.type === "code" ? (
                <CodeCell
                  cell={cell}
                  isSelected={cell.id === selectedCellId}
                  isEditing={cell.id === selectedCellId && mode === "edit"}
                />
              ) : (
                <MarkdownCell
                  cell={cell}
                  isSelected={cell.id === selectedCellId}
                  isEditing={cell.id === selectedCellId && mode === "edit"}
                />
              )}
            </Box>
          ))}

          <AddCellDivider index={notebook?.cells.length ?? 0} />

          {notebook && !notebook.cells.length && (
            <Typography
              sx={{
                textAlign: "center",
                color: "text.disabled",
                mt: 4,
                fontSize: 14,
              }}
            >
              This notebook is empty. Add a cell to get started, or press{" "}
              <strong>H</strong> to see the keyboard shortcuts.
            </Typography>
          )}
        </Container>
      </Box>

      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
