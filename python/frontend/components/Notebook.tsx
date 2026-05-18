"use client";

import { useState } from "react";
import CodeCell from "./CodeCell";
import { Cell } from "@/types/cell";

const Notebook = () => {
  const [cells, setCells] = useState<Cell[]>([
    {
      id: crypto.randomUUID(),
      language: "python",
      code: 'print("hello world")',
      output: "",
    },
  ]);

  const addCell = () => {
    const newCell: Cell = {
      id: crypto.randomUUID(),
      language: "python",
      code: "",
      output: "",
    };

    setCells([...cells, newCell]);
  };

  return (
    <div className="space-y-6">
      {cells.map((cell) => (
        <CodeCell key={cell.id} />
      ))}

      <button
        onClick={addCell}
        className="bg-white text-black px-4 py-2 rounded-lg"
      >
        + Add Cell
      </button>
    </div>
  );
};

export default Notebook;
