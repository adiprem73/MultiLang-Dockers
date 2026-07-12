"use client";

import { useState } from "react";
import { alpha, Box, Button, useTheme } from "@mui/material";
import { Add } from "@mui/icons-material";

import { useNotebookStore } from "@/store/notebookStore";

/**
 * The hover-to-insert strip between cells. Keeps the common action (add a cell
 * exactly here) within reach without a permanently visible row of buttons.
 */
export default function AddCellDivider({ index }: { index: number }) {
  const [hovered, setHovered] = useState(false);
  const theme = useTheme();
  const accent = theme.palette.primary.main;

  const addCell = useNotebookStore((state) => state.addCell);

  const button = {
    minWidth: 0,
    px: 1.25,
    py: 0.25,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "none" as const,
    color: "text.secondary",
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: "divider",
    "&:hover": {
      color: accent,
      borderColor: alpha(accent, 0.5),
      bgcolor: "background.paper",
    },
  };

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        position: "relative",
        height: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "default",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "1px",
          bgcolor: hovered ? alpha(accent, 0.3) : "transparent",
          transition: "background-color .15s",
        }}
      />

      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          zIndex: 1,
          opacity: hovered ? 1 : 0,
          transition: "opacity .15s",
          pointerEvents: hovered ? "auto" : "none",
        }}
      >
        <Button
          size="small"
          startIcon={<Add sx={{ fontSize: 13 }} />}
          onClick={() => addCell("code", index)}
          sx={button}
        >
          Code
        </Button>
        <Button
          size="small"
          startIcon={<Add sx={{ fontSize: 13 }} />}
          onClick={() => addCell("markdown", index)}
          sx={button}
        >
          Markdown
        </Button>
      </Box>
    </Box>
  );
}
