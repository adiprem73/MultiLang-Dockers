"use client";

import { Box, IconButton, MenuItem, Select, Tooltip, useTheme } from "@mui/material";
import {
  ArrowDownward,
  ArrowUpward,
  ContentCopy,
  Delete,
  PlayArrow,
  Add,
} from "@mui/icons-material";

import { Cell, LANGUAGES, Language } from "@/types/cell";
import { useNotebookStore } from "@/store/notebookStore";

type Props = {
  cell: Cell;
  visible: boolean;
  accent: string;
};

export default function CellToolbar({ cell, visible, accent }: Props) {
  const theme = useTheme();

  const runCell = useNotebookStore((state) => state.runCell);
  const deleteCell = useNotebookStore((state) => state.deleteCell);
  const moveCell = useNotebookStore((state) => state.moveCell);
  const copyCell = useNotebookStore((state) => state.copyCell);
  const setCellType = useNotebookStore((state) => state.setCellType);
  const setCellLanguage = useNotebookStore((state) => state.setCellLanguage);
  const addCellRelative = useNotebookStore((state) => state.addCellRelative);

  const isCode = cell.type === "code";

  const action = (handler: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    handler();
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.5,
        minHeight: 36,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Select
        value={isCode ? cell.language ?? "python" : "markdown"}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "markdown") setCellType(cell.id, "markdown");
          else if (!isCode) {
            setCellType(cell.id, "code");
            setCellLanguage(cell.id, value as Language);
          } else setCellLanguage(cell.id, value as Language);
        }}
        variant="standard"
        disableUnderline
        sx={{
          fontSize: 11,
          letterSpacing: 0.5,
          color: accent,
          "& .MuiSelect-select": { py: 0.25, pl: 0.75, pr: "20px !important" },
          "& .MuiSelect-icon": { color: "text.disabled", fontSize: 16 },
          borderRadius: 1,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {LANGUAGES.map((language) => (
          <MenuItem key={language.value} value={language.value} sx={{ fontSize: 12 }}>
            {language.label}
          </MenuItem>
        ))}
        <MenuItem value="markdown" sx={{ fontSize: 12 }}>
          Markdown
        </MenuItem>
      </Select>

      <Box sx={{ flexGrow: 1 }} />

      <Box
        sx={{
          display: "flex",
          gap: 0.25,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          transition: "opacity .15s",
        }}
      >
        {isCode && (
          <Tooltip title="Run (Shift+Enter)" placement="top">
            <IconButton
              size="small"
              onClick={action(() => runCell(cell.id))}
              sx={{ color: "secondary.main", p: 0.5 }}
            >
              <PlayArrow sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Insert cell below (B)" placement="top">
          <IconButton
            size="small"
            onClick={action(() => addCellRelative(cell.id, "code", "below"))}
            sx={{ color: "primary.main", p: 0.5 }}
          >
            <Add sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Move up" placement="top">
          <IconButton
            size="small"
            onClick={action(() => moveCell(cell.id, -1))}
            sx={{ color: "text.secondary", p: 0.5 }}
          >
            <ArrowUpward sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Move down" placement="top">
          <IconButton
            size="small"
            onClick={action(() => moveCell(cell.id, 1))}
            sx={{ color: "text.secondary", p: 0.5 }}
          >
            <ArrowDownward sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Copy cell (C)" placement="top">
          <IconButton
            size="small"
            onClick={action(() => copyCell(cell.id))}
            sx={{ color: "text.secondary", p: 0.5 }}
          >
            <ContentCopy sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Delete cell (D,D)" placement="top">
          <IconButton
            size="small"
            onClick={action(() => deleteCell(cell.id))}
            sx={{ color: theme.palette.error.main, p: 0.5, opacity: 0.8 }}
          >
            <Delete sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
