"use client";

import { useEffect, useRef, useState } from "react";
import { alpha, Box, IconButton, Tooltip, useTheme } from "@mui/material";
import { Add, Close } from "@mui/icons-material";

import { useNotebookStore } from "@/store/notebookStore";

export default function NotebookTabs() {
  const theme = useTheme();
  const accent = theme.palette.primary.main;

  const notebooks = useNotebookStore((state) => state.notebooks);
  const activeNotebookId = useNotebookStore((state) => state.activeNotebookId);
  const createNotebook = useNotebookStore((state) => state.createNotebook);
  const setActiveNotebook = useNotebookStore((state) => state.setActiveNotebook);
  const renameNotebook = useNotebookStore((state) => state.renameNotebook);
  const deleteNotebook = useNotebookStore((state) => state.deleteNotebook);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingId) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingId]);

  const commit = () => {
    if (editingId && draft.trim()) renameNotebook(editingId, draft);
    setEditingId(null);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-end",
        overflowX: "auto",
        flexGrow: 1,
        gap: "2px",
        px: 1,
        pb: "2px",
        "&::-webkit-scrollbar": { height: 3 },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: theme.palette.notebook.scrollbar,
          borderRadius: 2,
        },
      }}
    >
      {notebooks.map((notebook) => {
        const isActive = notebook.id === activeNotebookId;
        const isEditing = editingId === notebook.id;

        return (
          <Box
            key={notebook.id}
            onClick={() => setActiveNotebook(notebook.id)}
            onDoubleClick={() => {
              setEditingId(notebook.id);
              setDraft(notebook.title);
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.5,
              py: 0.75,
              minWidth: 130,
              maxWidth: 220,
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
              border: "1px solid",
              borderBottom: "none",
              borderColor: isActive
                ? alpha(accent, 0.45)
                : theme.palette.notebook.cellBorder,
              bgcolor: isActive ? alpha(accent, 0.08) : "action.hover",
              transition: "all .15s",
              "&:hover": {
                bgcolor: isActive
                  ? alpha(accent, 0.08)
                  : "action.selected",
              },
              "&:hover .tab-close": { opacity: 1 },
            }}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commit();
                  if (event.key === "Escape") setEditingId(null);
                  event.stopPropagation();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: accent,
                  fontFamily: "inherit",
                  fontSize: 12,
                  width: "100%",
                  minWidth: 0,
                }}
              />
            ) : (
              <Box
                component="span"
                title={`${notebook.title} — double-click to rename`}
                sx={{
                  fontSize: 12,
                  color: isActive ? accent : "text.secondary",
                  fontWeight: isActive ? 600 : 400,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flexGrow: 1,
                }}
              >
                {notebook.title}
              </Box>
            )}

            <IconButton
              className="tab-close"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                if (
                  window.confirm(
                    `Delete "${notebook.title}"? This cannot be undone.`,
                  )
                ) {
                  deleteNotebook(notebook.id);
                }
              }}
              sx={{
                p: 0.15,
                opacity: isActive ? 0.6 : 0,
                transition: "opacity .15s",
                color: "text.secondary",
                "&:hover": {
                  color: "error.main",
                  bgcolor: alpha(theme.palette.error.main, 0.12),
                },
              }}
            >
              <Close sx={{ fontSize: 12 }} />
            </IconButton>
          </Box>
        );
      })}

      <Tooltip title="New notebook" placement="top">
        <IconButton
          size="small"
          onClick={() => createNotebook()}
          sx={{
            mb: 0.5,
            ml: 0.5,
            color: alpha(accent, 0.6),
            border: "1px dashed",
            borderColor: alpha(accent, 0.25),
            borderRadius: "6px",
            p: 0.5,
            "&:hover": {
              color: accent,
              borderColor: alpha(accent, 0.6),
              bgcolor: alpha(accent, 0.08),
            },
          }}
        >
          <Add sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
