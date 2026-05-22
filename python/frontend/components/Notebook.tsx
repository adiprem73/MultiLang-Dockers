"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CodeCell from "./CodeCell";
import MarkdownCell from "./MarkdownCell";
import { Cell } from "@/types/cell";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Container,
} from "@mui/material";
import Navbar from "./Navbar";
import ToolWindow from "./ToolWindow";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#00ffff" },
    secondary: { main: "#00ff88" },
    background: { default: "#000000", paper: "#0a0a0f" },
    error: { main: "#ff0066" },
  },
});

const Notebook = () => {
  const [cells, setCells] = useState<Cell[]>([]);
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(
    null,
  );
  const sessionId = useRef<string | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!hasLoaded.current) return;
    localStorage.setItem("notebook-cells", JSON.stringify(cells));
  }, [cells]);

  useEffect(() => {
    const savedCells = localStorage.getItem("notebook-cells");
    if (savedCells) {
      setCells(JSON.parse(savedCells));
    } else {
      setCells([
        {
          id: crypto.randomUUID(),
          type: "code",
          language: "python",
          code: 'print("hello world")',
          output: "",
        },
      ]);
    }
    sessionId.current = crypto.randomUUID();
    hasLoaded.current = true;
  }, []);

  const addCellBelow = useCallback(
    (currentCellId: string, type: "code" | "markdown") => {
      const newCell: Cell = {
        id: crypto.randomUUID(),
        type,
        language: type === "code" ? "python" : undefined,
        code: type === "markdown" ? "# New Markdown Cell" : "",
        output: "",
      };
      setCells((prev) => {
        const currentIndex = prev.findIndex(
          (cell) => cell.id === currentCellId,
        );
        const updated = [...prev];
        updated.splice(currentIndex + 1, 0, newCell);
        return updated;
      });
    },
    [],
  );

  const deleteCell = useCallback((id: string) => {
    setCells((prevCells) => prevCells.filter((cell) => cell.id !== id));
    setSelectedCellIndex(null);
  }, []);

  const updateCell = useCallback((id: string, updatedFields: Partial<Cell>) => {
    setCells((prevCells) =>
      prevCells.map((cell) =>
        cell.id === id ? { ...cell, ...updatedFields } : cell,
      ),
    );
  }, []);

  const handleAddCell = useCallback(() => {
    const newCell: Cell = {
      id: crypto.randomUUID(),
      type: "code",
      language: "python",
      code: "",
      output: "",
    };
    setCells((prev) => [...prev, newCell]);
  }, []);

  const handleRunAllBelow = useCallback((_index: number) => {
    // can wire up bulk execution later
  }, []);

  const handleDeleteAllBelow = useCallback((index: number) => {
    setCells((prev) => {
      if (index >= prev.length - 1) return prev;
      return prev.slice(0, index + 1);
    });
    setSelectedCellIndex(null);
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          bgcolor: "#000000",
          backgroundImage:
            "radial-gradient(circle at 20% 50%, rgba(0, 255, 255, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 0, 255, 0.03) 0%, transparent 50%)",
        }}
      >
        <Navbar />
        <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
          <Box
            sx={{
              flexGrow: 1,
              overflow: "auto",
              p: 3,
              "&::-webkit-scrollbar": { width: "8px" },
              "&::-webkit-scrollbar-track": { bgcolor: "rgba(0, 0, 0, 0.2)" },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "rgba(0, 255, 255, 0.3)",
                borderRadius: "4px",
                "&:hover": { bgcolor: "rgba(0, 255, 255, 0.5)" },
              },
            }}
          >
            <Container maxWidth="lg">
              {cells.map((cell, index) =>
                cell.type === "code" ? (
                  <CodeCell
                    key={cell.id}
                    cell={cell}
                    updateCell={updateCell}
                    deleteCell={deleteCell}
                    addCellBelow={addCellBelow}
                    sessionId={sessionId.current ?? "default"}
                    onSelect={() => setSelectedCellIndex(index)}
                  />
                ) : (
                  <MarkdownCell
                    key={cell.id}
                    cell={cell}
                    updateCell={updateCell}
                    deleteCell={deleteCell}
                    addCellBelow={addCellBelow}
                    onSelect={() => setSelectedCellIndex(index)}
                  />
                ),
              )}
            </Container>
          </Box>

          <ToolWindow
            onRunAllBelow={handleRunAllBelow}
            onDeleteAllBelow={handleDeleteAllBelow}
            onAddCell={handleAddCell}
            selectedCellIndex={selectedCellIndex}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Notebook;
