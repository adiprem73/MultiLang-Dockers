"use client";

import Editor, {OnMount} from "@monaco-editor/react";
import { Cell } from "@/types/cell";
import { useCallback, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface Props {
  cell: Cell;
  updateCell: (id: string, updatedFields: Partial<Cell>) => void;
  deleteCell: (id: string) => void;
  addCellBelow: (currentCellId: string, type: "code" | "markdown") => void;
}

const CodeCell = ({ cell, updateCell, deleteCell, addCellBelow }: Props) => {
    // const handleEditorMount: OnMount = (editor, monaco) => {
    //   editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
    //     runCode();
    //   });
    // };

    const handleEditorMount: OnMount = (editor, monaco) => {
      editor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyCode.Enter,
        async () => {
          const latestCode = editor.getValue();

          updateCell(cell.id, {
            code: latestCode,
            output: "Running...",
          });

          try {
            const response = await fetch("http://localhost:5000/execute", {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                language: languageRef.current,
                code: latestCode,
              }),
            });

            const data = await response.json();

            if (data.output) {
              updateCell(cell.id, {
                output: data.output,
              });
            } else if (data.error) {
              updateCell(cell.id, {
                output: data.error,
              });
            }
          } catch (error) {
            updateCell(cell.id, {
              output: "Something went wrong",
            });

            console.error(error);
          }
        },
      );
    };

    const languageRef = useRef(cell.language);
    useEffect(() => {
      languageRef.current = cell.language;
    }, [cell.language]);
    const runCode = useCallback(async () => {
      try {
        updateCell(cell.id, {
          output: "Running...",
        });

        const response = await fetch("http://localhost:5000/execute", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            language: cell.language,
            code: cell.code,
          }),
        });

        const data = await response.json();

        if (data.output) {
          updateCell(cell.id, {
            output: data.output,
          });
        } else if (data.error) {
          updateCell(cell.id, {
            output: data.error,
          });
        } else {
          updateCell(cell.id, {
            output: "No output received",
          });
        }
      } catch (error) {
        updateCell(cell.id, {
          output: "Something went wrong",
        });

        console.error(error);
      }
    }, [cell, updateCell]);

  return (
    <div className="border rounded-xl p-4 space-y-4">
      <select
        value={cell.language}
        onChange={(e) =>
          updateCell(cell.id, {
            language: e.target.value,
          })
        }
        className="border px-3 py-2 rounded-lg"
      >
        <option value="python">Python</option>
        <option value="javascript">JavaScript</option>
        <option value="cpp">C++</option>
        <option value="java">Java</option>
      </select>

      {cell.type === "markdown" ? (
        <div className="space-y-4">
          <textarea
            value={cell.code}
            onChange={(e) =>
              updateCell(cell.id, {
                code: e.target.value,
              })
            }
            className="w-full min-h-[200px] bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-white outline-none"
          />

          <div className="prose prose-invert max-w-none bg-zinc-950 p-6 rounded-lg border border-zinc-800">
            <ReactMarkdown>{cell.code}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <Editor
          height="300px"
          language={cell.language}
          value={cell.code}
          onChange={(value) => updateCell(cell.id, { code: value || "" })}
          onMount={handleEditorMount}
          theme="vs-dark"
        />
      )}

      {/* <button
        onClick={runCode}
        className="bg-black text-white px-4 py-2 rounded-lg"
      >
        Run
      </button> */}

      <div className="flex gap-3">
        <button
          onClick={runCode}
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          Run
        </button>

        <button
          onClick={() => deleteCell(cell.id)}
          className="bg-red-500 text-white px-4 py-2 rounded-lg"
        >
          Delete
        </button>
        <button
          onClick={() => addCellBelow(cell.id, "code")}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          + Code Cell
        </button>

        <button
          onClick={() => addCellBelow(cell.id, "markdown")}
          className="bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          + Markdown Cell
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 text-green-400 p-4 rounded-lg min-h-[100px]">
        {cell.output}
      </div>
    </div>
  );
};

export default CodeCell;
