import { CellOutput, CellSeed, Language } from "@/types/cell";
import { Notebook } from "@/types/notebook";

/**
 * Import/export of the real Jupyter `.ipynb` format (nbformat 4), so notebooks
 * made here open in Jupyter and vice versa.
 */

const KERNELS: Record<Language, { name: string; display: string }> = {
  python: { name: "python3", display: "Python 3" },
  javascript: { name: "javascript", display: "JavaScript" },
  java: { name: "java", display: "Java" },
  cpp: { name: "cpp", display: "C++" },
};

// nbformat stores text as a list of lines, each keeping its trailing newline.
const toLines = (text: string): string[] =>
  text.length ? text.split(/(?<=\n)/) : [];

const fromLines = (source: unknown): string =>
  Array.isArray(source) ? source.join("") : typeof source === "string" ? source : "";

const outputToJupyter = (output: CellOutput) => {
  const outputs: unknown[] = [];

  if (output.stdout) {
    outputs.push({
      output_type: "stream",
      name: "stdout",
      text: toLines(output.stdout),
    });
  }

  if (output.stderr) {
    outputs.push({
      output_type: "stream",
      name: "stderr",
      text: toLines(output.stderr),
    });
  }

  if (output.result) {
    outputs.push({
      output_type: "execute_result",
      execution_count: output.executionCount ?? null,
      data: { "text/plain": toLines(output.result) },
      metadata: {},
    });
  }

  return outputs;
};

const outputFromJupyter = (outputs: unknown): CellOutput | null => {
  if (!Array.isArray(outputs) || !outputs.length) return null;

  let stdout = "";
  let stderr = "";
  let result: string | null = null;
  let status: CellOutput["status"] = "ok";

  for (const entry of outputs as any[]) {
    switch (entry?.output_type) {
      case "stream":
        if (entry.name === "stderr") stderr += fromLines(entry.text);
        else stdout += fromLines(entry.text);
        break;

      case "execute_result":
      case "display_data":
        result = fromLines(entry.data?.["text/plain"]) || result;
        break;

      case "error":
        status = "error";
        stderr += (entry.traceback ?? []).join("\n");
        break;
    }
  }

  return { status, stdout, stderr, result };
};

export function notebookToIpynb(notebook: Notebook) {
  const language: Language =
    notebook.cells.find((cell) => cell.type === "code")?.language ?? "python";

  const kernel = KERNELS[language];

  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        name: kernel.name,
        display_name: kernel.display,
        language,
      },
      language_info: { name: language },
    },
    cells: notebook.cells.map((cell) =>
      cell.type === "markdown"
        ? {
            cell_type: "markdown",
            metadata: {},
            source: toLines(cell.source),
          }
        : {
            cell_type: "code",
            metadata: { language: cell.language ?? "python" },
            execution_count: cell.output?.executionCount ?? null,
            source: toLines(cell.source),
            outputs: cell.output ? outputToJupyter(cell.output) : [],
          },
    ),
  };
}

export function downloadIpynb(notebook: Notebook) {
  const json = JSON.stringify(notebookToIpynb(notebook), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${notebook.title.replace(/[^\w.-]+/g, "_") || "notebook"}.ipynb`;
  link.click();

  URL.revokeObjectURL(url);
}

const LANGUAGE_ALIASES: Record<string, Language> = {
  python: "python",
  python3: "python",
  javascript: "javascript",
  node: "javascript",
  java: "java",
  cpp: "cpp",
  "c++": "cpp",
};

export function ipynbToCells(json: unknown): CellSeed[] {
  const notebook = json as any;

  if (!notebook || !Array.isArray(notebook.cells)) {
    throw new Error("That doesn't look like a .ipynb file.");
  }

  const notebookLanguage =
    LANGUAGE_ALIASES[
      String(
        notebook.metadata?.language_info?.name ??
          notebook.metadata?.kernelspec?.language ??
          "python",
      ).toLowerCase()
    ] ?? "python";

  return notebook.cells
    .filter((cell: any) => cell?.cell_type !== "raw")
    .map((cell: any) => {
      const type = cell.cell_type === "markdown" ? "markdown" : "code";

      const language =
        LANGUAGE_ALIASES[String(cell.metadata?.language ?? "").toLowerCase()] ??
        notebookLanguage;

      const output =
        type === "code" ? outputFromJupyter(cell.outputs) : null;

      return {
        type,
        language,
        source: fromLines(cell.source),
        // The API takes output as a serialized string.
        output: output ? JSON.stringify(output) : "",
      } satisfies CellSeed;
    });
}
