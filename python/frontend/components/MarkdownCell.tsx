"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { alpha, Box, Theme, Typography, useTheme } from "@mui/material";

import { Cell } from "@/types/cell";
import { useNotebookStore } from "@/store/notebookStore";
import { registerEditor } from "@/lib/editorRegistry";
import CellToolbar from "./CellToolbar";

const markdownStyles = (theme: Theme) => {
  const heading = theme.palette.primary.main;
  const accent = theme.palette.notebook.markdown;

  return {
    color: "text.primary",
    fontSize: 15,
    lineHeight: 1.7,
    "& > *:first-of-type": { mt: 0 },
    "& > *:last-child": { mb: 0 },
    "& h1, & h2, & h3, & h4, & h5, & h6": {
      color: heading,
      fontWeight: 700,
      lineHeight: 1.3,
      mt: "1em",
      mb: "0.5em",
    },
    "& h1": { fontSize: "2rem" },
    "& h2": { fontSize: "1.6rem" },
    "& h3": { fontSize: "1.3rem" },
    "& h4": { fontSize: "1.1rem" },
    "& h5, & h6": { fontSize: "1rem" },
    "& p": { my: "0.75em" },
    "& a": { color: heading },
    "& code": {
      bgcolor: alpha(heading, 0.1),
      color: heading,
      px: "5px",
      py: "2px",
      borderRadius: "4px",
      fontFamily: "var(--font-geist-mono), monospace",
      fontSize: "0.9em",
    },
    "& pre": {
      bgcolor: theme.palette.notebook.output,
      border: "1px solid",
      borderColor: alpha(heading, 0.15),
      borderRadius: 1,
      p: 1.5,
      overflowX: "auto",
      "& code": {
        bgcolor: "transparent",
        p: 0,
        color: theme.palette.notebook.outputText,
      },
    },
    "& ul, & ol": { pl: "1.5em", my: "0.75em" },
    "& li": { mb: "0.25em" },
    "& blockquote": {
      borderLeft: `3px solid ${accent}`,
      pl: 1.5,
      ml: 0,
      my: "0.75em",
      color: "text.secondary",
    },
    "& table": { borderCollapse: "collapse", my: "0.75em", width: "100%" },
    "& th": {
      bgcolor: alpha(heading, 0.08),
      color: heading,
      p: 1,
      border: "1px solid",
      borderColor: alpha(heading, 0.15),
      textAlign: "left",
    },
    "& td": { p: 1, border: "1px solid", borderColor: "divider" },
    "& hr": { border: 0, borderTop: "1px solid", borderColor: "divider", my: 2 },
    "& img": { maxWidth: "100%" },
  } as const;
};

type Props = {
  cell: Cell;
  isSelected: boolean;
  isEditing: boolean;
};

const MarkdownCell = ({ cell, isSelected, isEditing }: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const theme = useTheme();
  const nb = theme.palette.notebook;
  const accent = nb.markdown;

  const selectCell = useNotebookStore((state) => state.selectCell);
  const setMode = useNotebookStore((state) => state.setMode);
  const updateCellSource = useNotebookStore((state) => state.updateCellSource);

  const prose = useMemo(() => markdownStyles(theme), [theme]);

  useEffect(
    () =>
      registerEditor(cell.id, () => {
        // Focus lands after the textarea has replaced the preview.
        requestAnimationFrame(() => textareaRef.current?.focus());
      }),
    [cell.id],
  );

  // Claim the caret if this cell was just created by Shift/Alt+Enter.
  useEffect(() => {
    if (!isEditing) return;
    if (!useNotebookStore.getState().consumeFocus(cell.id)) return;
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [cell.id, isEditing]);

  // Markdown renders when you leave edit mode, so an empty cell in preview
  // would be an invisible click target. Show a hint instead.
  const isEmpty = !cell.source.trim();

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const store = useNotebookStore.getState();

    if (event.key === "Enter" && event.shiftKey) {
      // Rendering a markdown cell is its "run": same advance-or-append rule as
      // a code cell, so you can walk down a notebook of mixed cells.
      event.preventDefault();
      textareaRef.current?.blur();
      store.runAndAdvance(cell.id);
      return;
    }

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      textareaRef.current?.blur();
      store.setMode("command");
      return;
    }

    if (event.key === "Enter" && event.altKey) {
      event.preventDefault();
      textareaRef.current?.blur();
      store.runAndInsertBelow(cell.id);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      textareaRef.current?.blur();
      store.setMode("command");
    }
  };

  return (
    <Box
      onClick={() => selectCell(cell.id)}
      onDoubleClick={() => {
        setMode("edit");
        requestAnimationFrame(() => textareaRef.current?.focus());
      }}
      sx={{
        display: "flex",
        mb: 1.5,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: isSelected ? alpha(accent, 0.45) : nb.cellBorder,
        bgcolor: isSelected ? nb.cellSelected : nb.cell,
        transition: "border-color .15s, background-color .15s",
        "&:hover": { borderColor: alpha(accent, 0.3) },
      }}
    >
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

        <Box sx={{ p: 2 }}>
          {isEditing ? (
            <Box
              component="textarea"
              ref={textareaRef}
              value={cell.source}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateCellSource(cell.id, event.target.value)
              }
              onKeyDown={handleKeyDown}
              onFocus={() => setMode("edit")}
              placeholder="# Write markdown here…"
              rows={Math.max(4, cell.source.split("\n").length + 1)}
              sx={{
                width: "100%",
                bgcolor: nb.output,
                border: "1px solid",
                borderColor: alpha(accent, 0.25),
                borderRadius: 1,
                p: 1.5,
                color: "text.primary",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 13,
                lineHeight: 1.6,
                outline: "none",
                resize: "vertical",
              }}
            />
          ) : isEmpty ? (
            <Typography sx={{ color: "text.disabled", fontStyle: "italic" }}>
              Empty markdown cell — double-click to edit
            </Typography>
          ) : (
            <Box sx={prose}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {cell.source}
              </ReactMarkdown>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default memo(MarkdownCell);
