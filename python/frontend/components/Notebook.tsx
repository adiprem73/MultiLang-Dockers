"use client";

import { useEffect, useRef, useState } from "react";
import CodeCell from "./CodeCell";
import { Cell } from "@/types/cell";
import MarkdownCell from "./MarkdownCell";
const Notebook = () => {
  const [cells, setCells] = useState<Cell[]>([]);

  const sessionId = useRef(crypto.randomUUID());

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

    hasLoaded.current = true;
  }, []);

  const addCellBelow = (currentCellId: string, type: "code" | "markdown") => {
    const newCell: Cell = {
      id: crypto.randomUUID(),
      type,
      language: type === "code" ? "python" : undefined,
      code: type === "markdown" ? "# New Markdown Cell" : "",
      output: "",
    };

    const currentIndex = cells.findIndex((cell) => cell.id === currentCellId);

    const updatedCells = [...cells];

    updatedCells.splice(currentIndex + 1, 0, newCell);

    setCells(updatedCells);
  };

  const deleteCell = (id: string) => {
    setCells((prevCells) => prevCells.filter((cell) => cell.id !== id));
  };

  const updateCell = (id: string, updatedFields: Partial<Cell>) => {
    setCells((prevCells) =>
      prevCells.map((cell) =>
        cell.id === id
          ? {
              ...cell,
              ...updatedFields,
            }
          : cell,
      ),
    );
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      {cells.map((cell) =>
        cell.type === "code" ? (
          <CodeCell
            key={cell.id}
            cell={cell}
            updateCell={updateCell}
            deleteCell={deleteCell}
            addCellBelow={addCellBelow}
            sessionId={sessionId.current}
          />
        ) : (
          <MarkdownCell
            key={cell.id}
            cell={cell}
            updateCell={updateCell}
            deleteCell={deleteCell}
            addCellBelow={addCellBelow}
          />
        ),
      )}
    </div>
  );
};

export default Notebook;
