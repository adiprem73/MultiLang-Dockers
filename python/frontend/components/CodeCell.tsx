"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { Cell } from "@/types/cell";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Paper,
  IconButton,
  Select,
  MenuItem,
  Box,
  Typography,
  FormControl,
} from "@mui/material";
import { PlayArrow, Add, Delete, Code, Description } from "@mui/icons-material";

interface Props {
  cell: Cell;
  updateCell: (id: string, updatedFields: Partial<Cell>) => void;
  deleteCell: (id: string) => void;
  addCellBelow: (currentCellId: string, type: "code" | "markdown") => void;
  sessionId: string;
  onSelect: () => void;
}

const CodeCell = ({
  cell,
  updateCell,
  deleteCell,
  addCellBelow,
  sessionId,
  onSelect,
}: Props) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const languageRef = useRef(cell.language);
  const codeRef = useRef(cell.code);

  useEffect(() => {
    languageRef.current = cell.language;
  }, [cell.language]);

  useEffect(() => {
    codeRef.current = cell.code;
  }, [cell.code]);

  const getLanguageColor = () => {
    switch (cell.language) {
      case "python":
        return "#00ffff";
      case "javascript":
        return "#ffff00";
      case "java":
        return "#ff6600";
      case "cpp":
        return "#00ff88";
      default:
        return "#00ffff";
    }
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, async () => {
      const latestCode = editor.getValue();
      updateCell(cell.id, { code: latestCode, output: "Running..." });

      try {
        const response = await fetch("http://localhost:5000/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: languageRef.current,
            code: latestCode,
            session_id: sessionId,
          }),
        });
        const data = await response.json();
        if (data.output) updateCell(cell.id, { output: data.output });
        else if (data.error) updateCell(cell.id, { output: data.error });
      } catch (error) {
        updateCell(cell.id, { output: "Something went wrong" });
        console.error(error);
      }
    });
  };

  // cell.id is stable per cell, using refs for code/language to avoid stale closure
  const runCode = useCallback(async () => {
    try {
      updateCell(cell.id, { output: "Running..." });

      const response = await fetch("http://localhost:5000/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: languageRef.current,
          code: codeRef.current,
          session_id: sessionId,
        }),
      });

      const data = await response.json();
      if (data.output) updateCell(cell.id, { output: data.output });
      else if (data.error) updateCell(cell.id, { output: data.error });
      else updateCell(cell.id, { output: "No output received" });
    } catch (error) {
      updateCell(cell.id, { output: "Something went wrong" });
      console.error(error);
    }
  }, [cell.id, updateCell, sessionId]); // no `cell` object — using refs instead

  return (
    <Paper
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        setIsSelected(true);
        onSelect();
      }}
      onBlur={() => setIsSelected(false)}
      sx={{
        mb: 2,
        bgcolor: "rgba(20, 20, 30, 0.5)",
        backdropFilter: "blur(20px)",
        border: isSelected
          ? `1px solid ${getLanguageColor()}`
          : "1px solid rgba(255, 255, 255, 0.1)",
        borderLeft: isSelected
          ? `4px solid ${getLanguageColor()}`
          : "4px solid rgba(255, 255, 255, 0.1)",
        boxShadow: isSelected
          ? `0 0 20px ${getLanguageColor()}40, inset 0 0 20px ${getLanguageColor()}10`
          : "0 4px 20px rgba(0, 0, 0, 0.3)",
        transition: "all 0.3s ease",
        "&:hover": {
          bgcolor: "rgba(30, 30, 40, 0.6)",
          border: `1px solid ${getLanguageColor()}80`,
          boxShadow: `0 0 20px ${getLanguageColor()}40`,
        },
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 1,
          borderBottom: `1px solid rgba(${cell.type === "code" ? "0, 255, 255" : "0, 255, 136"}, 0.2)`,
          bgcolor: "rgba(0, 0, 0, 0.3)",
        }}
      >
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            updateCell(cell.id, {
              type: cell.type === "code" ? "markdown" : "code",
            });
          }}
          sx={{
            color: cell.type === "code" ? "#00ffff" : "#00ff88",
            filter: `drop-shadow(0 0 6px ${cell.type === "code" ? "#00ffff" : "#00ff88"})`,
            "&:hover": {
              filter: `drop-shadow(0 0 12px ${cell.type === "code" ? "#00ffff" : "#00ff88"})`,
            },
          }}
        >
          {cell.type === "code" ? <Code /> : <Description />}
        </IconButton>

        {cell.type === "code" && (
          <FormControl size="small" sx={{ ml: 1, minWidth: 120 }}>
            <Select
              value={cell.language || "python"}
              onChange={(e) =>
                updateCell(cell.id, { language: e.target.value })
              }
              onClick={(e) => e.stopPropagation()}
              sx={{
                color: "#fff",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: `${getLanguageColor()}80`,
                  borderWidth: 1,
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: getLanguageColor(),
                  boxShadow: `0 0 10px ${getLanguageColor()}60`,
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: getLanguageColor(),
                  boxShadow: `0 0 15px ${getLanguageColor()}80`,
                },
                height: 32,
                backdropFilter: "blur(10px)",
                bgcolor: "rgba(0, 0, 0, 0.4)",
              }}
            >
              <MenuItem value="python">Python</MenuItem>
              <MenuItem value="javascript">JavaScript</MenuItem>
              <MenuItem value="java">Java</MenuItem>
              <MenuItem value="cpp">C++</MenuItem>
            </Select>
          </FormControl>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {(isHovered || isSelected) && (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {cell.type === "code" && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  runCode();
                }}
                sx={{
                  color: "#00ff88",
                  filter: "drop-shadow(0 0 6px #00ff88)",
                  "&:hover": {
                    bgcolor: "rgba(0, 255, 136, 0.2)",
                    filter: "drop-shadow(0 0 12px #00ff88)",
                  },
                }}
              >
                <PlayArrow />
              </IconButton>
            )}

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
              <Add />
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
              <Delete />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Editor area */}
      <Box sx={{ p: 2 }}>
        {cell.type === "code" ? (
          <Editor
            height="300px"
            language={cell.language}
            value={cell.code}
            onChange={(value) => updateCell(cell.id, { code: value || "" })}
            onMount={handleEditorMount}
            theme="vs-dark"
          />
        ) : (
          <textarea
            value={cell.code}
            onChange={(e) => updateCell(cell.id, { code: e.target.value })}
            placeholder="Write markdown here..."
            style={{
              width: "100%",
              minHeight: "200px",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              padding: "12px",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: "16px",
              outline: "none",
              resize: "vertical",
            }}
          />
        )}

        {cell.output && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(10px)",
              borderRadius: 1,
              border: `1px solid ${getLanguageColor()}40`,
              borderLeft: `3px solid ${getLanguageColor()}`,
              boxShadow: `0 0 20px ${getLanguageColor()}20`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: getLanguageColor(),
                fontWeight: 600,
                display: "block",
                mb: 1,
                textShadow: `0 0 10px ${getLanguageColor()}`,
                letterSpacing: 1,
              }}
            >
              OUTPUT:
            </Typography>
            <Typography
              sx={{
                color: "#fff",
                fontFamily: "monospace",
                fontSize: "13px",
                whiteSpace: "pre-wrap",
              }}
            >
              {cell.output}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default CodeCell;
