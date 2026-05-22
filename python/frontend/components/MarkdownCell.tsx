"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Cell } from "@/types/cell";

type Props = {
  cell: Cell;
  updateCell: (id: string, updatedFields: Partial<Cell>) => void;
  deleteCell: (id: string) => void;
  addCellBelow: (id: string, type: "code" | "markdown") => void;
};

const MarkdownCell = ({
  cell,
  updateCell,
  deleteCell,
  addCellBelow,
}: Props) => {
  const [preview, setPreview] = useState(true);

  return (
    <div className="border rounded-xl p-4 space-y-4 bg-black">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setPreview(!preview)}
          className="bg-black text-white px-3 py-1 rounded"
        >
          {preview ? "Edit" : "Preview"}
        </button>

        <button
          onClick={() => addCellBelow(cell.id, "code")}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          + Code
        </button>

        <button
          onClick={() => addCellBelow(cell.id, "markdown")}
          className="bg-green-500 text-white px-3 py-1 rounded"
        >
          + Markdown
        </button>

        <button
          onClick={() => deleteCell(cell.id)}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          Delete
        </button>
      </div>

      {preview ? (
        <div className="prose max-w-none border p-4 rounded bg-gray-50">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{cell.code}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={cell.code}
          onChange={(e) => updateCell(cell.id, { code: e.target.value })}
          className="w-full min-h-[200px] border rounded p-3 font-mono"
          placeholder="# Write markdown here"
        />
      )}
    </div>
  );
};

export default MarkdownCell;
