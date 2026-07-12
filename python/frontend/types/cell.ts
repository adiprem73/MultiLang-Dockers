export type CellType = "code" | "markdown";

export type Language = "python" | "javascript" | "java" | "cpp";

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
];

// Colours live in lib/theme.ts — they differ between light and dark mode.

/**
 * The result of running a cell. Persisted as JSON in the `output` text column,
 * so richer results can be added without a migration.
 */
export type CellOutput = {
  status: "ok" | "error";
  stdout?: string;
  stderr?: string;
  /** repr / inspect of a trailing expression, the way Jupyter echoes it. */
  result?: string | null;
  durationMs?: number;
  executionCount?: number;
};

export type Cell = {
  id: string;
  type: CellType;
  language?: Language;
  source: string;
  output?: CellOutput | null;
  /** Set while the cell is queued or running; drives the [*] prompt. */
  running?: boolean;
};

/**
 * A cell being sent *to* the API (import, seeding a new notebook). `output` is
 * already serialized here, which is what the API stores.
 */
export type CellSeed = {
  type: CellType;
  language?: Language;
  source: string;
  output?: string;
};

/** Cells used to store output as a bare string; keep those rows readable. */
export function parseOutput(raw: unknown): CellOutput | null {
  if (!raw || typeof raw !== "string") return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "status" in parsed) {
      return parsed as CellOutput;
    }
    return { status: "ok", stdout: raw };
  } catch {
    return { status: "ok", stdout: raw };
  }
}

export const serializeOutput = (output: CellOutput | null | undefined) =>
  output ? JSON.stringify(output) : "";

export const isEmptyOutput = (output?: CellOutput | null) =>
  !output || (!output.stdout && !output.stderr && !output.result);
