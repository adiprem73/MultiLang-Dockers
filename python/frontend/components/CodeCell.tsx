"use client";

import { memo, useEffect, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";

import { Cell } from "@/types/cell";
import { languageColor } from "@/lib/theme";
import { useNotebookStore } from "@/store/notebookStore";
import { blurActiveEditor, registerEditor } from "@/lib/editorRegistry";
import CellToolbar from "./CellToolbar";
import OutputArea from "./OutputArea";

const MIN_HEIGHT = 40;
const MAX_HEIGHT = 560;

type Props = {
  cell: Cell;
  isSelected: boolean;
  isEditing: boolean;
};

const CodeCell = ({ cell, isSelected, isEditing }: Props) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const theme = useTheme();
  const nb = theme.palette.notebook;

  const selectCell = useNotebookStore((state) => state.selectCell);
  const setMode = useNotebookStore((state) => state.setMode);
  const updateCellSource = useNotebookStore((state) => state.updateCellSource);
  const clearOutput = useNotebookStore((state) => state.clearOutput);

  const accent = languageColor(cell.language, theme.palette.mode);

  useEffect(
    () =>
      registerEditor(cell.id, () => {
        editorRef.current?.focus();
      }),
    [cell.id],
  );

  // The store is the source of truth for the text (undo of a delete, paste, and
  // .ipynb import all rewrite it), but writing on every keystroke would fight
  // the editor. Only push in when they've actually diverged.
  useEffect(() => {
    const instance = editorRef.current;
    if (instance && !instance.hasTextFocus() && instance.getValue() !== cell.source) {
      instance.setValue(cell.source);
    }
  }, [cell.source]);

  const handleMount: OnMount = (instance, monaco) => {
    editorRef.current = instance;

    // Grow with the content instead of scrolling inside a fixed box — a cell
    // should look like part of the page, not an iframe.
    const resize = () => {
      const height = Math.min(
        Math.max(instance.getContentHeight(), MIN_HEIGHT),
        MAX_HEIGHT,
      );
      if (containerRef.current) {
        containerRef.current.style.height = `${height}px`;
      }
      instance.layout();
    };

    instance.onDidContentSizeChange(resize);
    resize();

    instance.onDidFocusEditorText(() => {
      const store = useNotebookStore.getState();
      store.selectCell(cell.id);
      store.setMode("edit");
    });

    // Reading the store lazily keeps these handlers from capturing a stale cell.
    const store = () => useNotebookStore.getState();

    // A cell created by Shift/Alt+Enter asks for the caret before Monaco has
    // finished mounting, so we take it here instead.
    if (store().consumeFocus(cell.id)) instance.focus();

    instance.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      // Blur before running: leaving the caret in this editor would keep us in
      // edit mode and swallow every command-mode shortcut afterwards.
      blurActiveEditor();
      store().runAndAdvance(cell.id);
    });

    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      blurActiveEditor();
      store().setMode("command");
      store().runCell(cell.id);
    });

    instance.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Enter, () => {
      blurActiveEditor();
      store().runAndInsertBelow(cell.id);
    });

    instance.addCommand(monaco.KeyCode.Escape, () => {
      blurActiveEditor();
      store().setMode("command");
    });
  };

  const prompt = cell.running
    ? "[*]"
    : cell.output?.executionCount
      ? `[${cell.output.executionCount}]`
      : "[ ]";

  return (
    <Box
      onClick={() => {
        selectCell(cell.id);
        if (!isEditing) setMode("command");
      }}
      sx={{
        display: "flex",
        mb: 1.5,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: isSelected ? `${accent}66` : nb.cellBorder,
        bgcolor: isSelected ? nb.cellSelected : nb.cell,
        transition: "border-color .15s, background-color .15s",
        "&:hover": { borderColor: `${accent}44` },
      }}
    >
      {/* Selection bar: solid in edit mode, hollow in command mode — the way
          Jupyter tells you whether typing will go into the cell. */}
      <Box
        sx={{
          width: 4,
          flexShrink: 0,
          borderRadius: "6px 0 0 6px",
          bgcolor: !isSelected
            ? "transparent"
            : isEditing
              ? accent
              : "action.disabled",
          boxShadow:
            isSelected && isEditing && theme.palette.mode === "dark"
              ? `0 0 12px ${accent}`
              : "none",
        }}
      />

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <CellToolbar cell={cell} visible={isSelected} accent={accent} />

        <Box sx={{ display: "flex", px: 1, pb: 1.5 }}>
          <Box
            sx={{
              width: 56,
              pt: 1,
              flexShrink: 0,
              textAlign: "right",
              pr: 1.5,
              userSelect: "none",
            }}
          >
            {cell.running ? (
              <CircularProgress size={12} sx={{ color: accent }} />
            ) : (
              <Typography
                sx={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 12,
                  color: cell.output?.executionCount
                    ? nb.prompt
                    : nb.promptEmpty,
                }}
              >
                {prompt}
              </Typography>
            )}
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box
              ref={containerRef}
              sx={{
                height: MIN_HEIGHT,
                borderRadius: 1,
                overflow: "hidden",
                border: "1px solid",
                borderColor: nb.cellBorder,
                bgcolor: nb.editor,
              }}
            >
              <Editor
                defaultValue={cell.source}
                language={cell.language ?? "python"}
                theme={nb.monaco}
                onMount={handleMount}
                onChange={(value) => updateCellSource(cell.id, value ?? "")}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: "on",
                  lineNumbersMinChars: 3,
                  folding: false,
                  fontSize: 13,
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                  padding: { top: 10, bottom: 10 },
                  renderLineHighlight: "none",
                  scrollbar: {
                    alwaysConsumeMouseWheel: false,
                    vertical: "auto",
                  },
                  overviewRulerLanes: 0,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: "on",
                }}
              />
            </Box>

            {cell.output && (
              <OutputArea
                output={cell.output}
                onClear={() => clearOutput(cell.id)}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default memo(CodeCell);
