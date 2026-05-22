"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Cell } from "@/types/cell";
import { Paper, IconButton, Box, Typography } from "@mui/material";
import {
  Add,
  Delete,
  Description,
  Edit,
  Visibility,
} from "@mui/icons-material";

type Props = {
  cell: Cell;
  updateCell: (id: string, updatedFields: Partial<Cell>) => void;
  deleteCell: (id: string) => void;
  addCellBelow: (id: string, type: "code" | "markdown") => void;
  onSelect: () => void;
};

const MarkdownCell = ({
  cell,
  updateCell,
  deleteCell,
  addCellBelow,
  onSelect,
}: Props) => {
  const [preview, setPreview] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Paper
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      sx={{
        mb: 2,
        bgcolor: "rgba(20, 20, 30, 0.5)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderLeft: "4px solid #00ff88",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        transition: "all 0.3s ease",
        "&:hover": {
          bgcolor: "rgba(30, 30, 40, 0.6)",
          border: "1px solid rgba(0, 255, 136, 0.5)",
          borderLeft: "4px solid #00ff88",
          boxShadow: "0 0 20px rgba(0, 255, 136, 0.4)",
        },
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 1,
          borderBottom: "1px solid rgba(0, 255, 136, 0.2)",
          bgcolor: "rgba(0, 0, 0, 0.3)",
        }}
      >
        <Description
          sx={{
            color: "#00ff88",
            fontSize: 20,
            filter: "drop-shadow(0 0 6px #00ff88)",
            ml: 0.5,
          }}
        />
        <Typography
          variant="caption"
          sx={{ color: "#00ff88", ml: 1, letterSpacing: 1, opacity: 0.8 }}
        >
          MARKDOWN
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {isHovered && (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // prevent triggering onSelect
                setPreview(!preview);
              }}
              sx={{
                color: "#00ffff",
                filter: "drop-shadow(0 0 6px #00ffff)",
                "&:hover": {
                  bgcolor: "rgba(0, 255, 255, 0.2)",
                  filter: "drop-shadow(0 0 12px #00ffff)",
                },
              }}
            >
              {preview ? (
                <Edit fontSize="small" />
              ) : (
                <Visibility fontSize="small" />
              )}
            </IconButton>

            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                addCellBelow(cell.id, "code");
              }}
              sx={{
                color: "#00ffff",
                filter: "drop-shadow(0 0 6px #00ffff)",
                "&:hover": {
                  bgcolor: "rgba(0, 255, 255, 0.2)",
                  filter: "drop-shadow(0 0 12px #00ffff)",
                },
              }}
            >
              <Add fontSize="small" />
            </IconButton>

            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                deleteCell(cell.id);
              }}
              sx={{
                color: "#ff0066",
                filter: "drop-shadow(0 0 6px #ff0066)",
                "&:hover": {
                  bgcolor: "rgba(255, 0, 102, 0.2)",
                  filter: "drop-shadow(0 0 12px #ff0066)",
                },
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Content area */}
      <Box sx={{ p: 2 }}>
        {preview ? (
          <Box
            sx={{
              p: 2,
              bgcolor: "rgba(0, 0, 0, 0.3)",
              borderRadius: 1,
              border: "1px solid rgba(0, 255, 136, 0.2)",
              color: "#fff",
              "& h1, & h2, & h3, & h4, & h5, & h6": {
                color: "#00ffff",
                marginTop: "0.5em",
                marginBottom: "0.25em",
              },
              "& p": { color: "#e0e0e0", lineHeight: 1.7 },
              "& code": {
                bgcolor: "rgba(0, 255, 255, 0.1)",
                color: "#00ffff",
                padding: "2px 6px",
                borderRadius: "4px",
                fontFamily: "monospace",
              },
              "& pre": {
                bgcolor: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(0, 255, 255, 0.2)",
                borderRadius: "4px",
                padding: "12px",
                overflowX: "auto",
              },
              "& ul, & ol": { color: "#e0e0e0", paddingLeft: "1.5em" },
              "& li": { marginBottom: "4px" },
              "& blockquote": {
                borderLeft: "3px solid #00ff88",
                paddingLeft: "12px",
                color: "#aaa",
                margin: "8px 0",
              },
              "& a": { color: "#00ffff" },
              "& table": { width: "100%", borderCollapse: "collapse" },
              "& th": {
                bgcolor: "rgba(0, 255, 255, 0.1)",
                color: "#00ffff",
                padding: "8px",
                border: "1px solid rgba(0, 255, 255, 0.2)",
              },
              "& td": {
                padding: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e0e0e0",
              },
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {cell.code}
            </ReactMarkdown>
          </Box>
        ) : (
          <textarea
            value={cell.code}
            onChange={(e) => updateCell(cell.id, { code: e.target.value })}
            placeholder="# Write markdown here"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              minHeight: "200px",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(0, 255, 136, 0.2)",
              borderRadius: "4px",
              padding: "12px",
              color: "#fff",
              fontFamily: "monospace",
              fontSize: "14px",
              outline: "none",
              resize: "vertical",
              lineHeight: "1.6",
            }}
          />
        )}
      </Box>
    </Paper>
  );
};

export default MarkdownCell;
