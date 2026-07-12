"use client";

import { create } from "zustand";
import { api, ApiError } from "@/lib/api";
import {
  Cell,
  CellOutput,
  CellSeed,
  CellType,
  Language,
  parseOutput,
  serializeOutput,
} from "@/types/cell";
import { KernelStatus, Notebook } from "@/types/notebook";

type Mode = "command" | "edit";

type TrashedCell = { cell: Cell; notebookId: string; index: number };

type NotebookStore = {
  notebooks: Notebook[];
  activeNotebookId: string | null;

  selectedCellId: string | null;
  mode: Mode;

  /**
   * A cell that should take the caret as soon as its editor mounts. Monaco
   * mounts asynchronously, so a newly created cell cannot be focused straight
   * away — the cell claims this on mount instead.
   */
  pendingFocusId: string | null;
  consumeFocus: (cellId: string) => boolean;

  isLoading: boolean;
  error: string | null;

  /** Number of writes currently in flight — drives the "Saving…" indicator. */
  savingCount: number;

  /** Kernel status and execution counter, per notebook. */
  kernelStatus: Record<string, KernelStatus>;
  executionCount: Record<string, number>;

  clipboard: Cell | null;
  trash: TrashedCell[];

  loadNotebooks: () => Promise<void>;

  createNotebook: (title?: string, cells?: CellSeed[]) => Promise<void>;
  renameNotebook: (id: string, title: string) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  setActiveNotebook: (id: string) => void;

  selectCell: (id: string | null) => void;
  selectRelative: (offset: number) => void;
  setMode: (mode: Mode) => void;

  addCell: (type: CellType, at?: number) => Promise<string | undefined>;
  addCellRelative: (
    cellId: string,
    type: CellType,
    where: "above" | "below",
  ) => Promise<string | undefined>;

  updateCellSource: (cellId: string, source: string) => void;
  setCellType: (cellId: string, type: CellType) => Promise<void>;
  setCellLanguage: (cellId: string, language: Language) => Promise<void>;

  deleteCell: (cellId: string) => Promise<void>;
  undoDeleteCell: () => Promise<void>;
  moveCell: (cellId: string, direction: -1 | 1) => Promise<void>;

  copyCell: (cellId: string) => void;
  cutCell: (cellId: string) => Promise<void>;
  pasteCell: () => Promise<void>;

  runCell: (cellId: string) => Promise<void>;
  runAndAdvance: (cellId: string) => Promise<void>;
  runAndInsertBelow: (cellId: string) => Promise<void>;
  runAll: () => Promise<void>;
  runAllAbove: (cellId: string) => Promise<void>;
  runAllBelow: (cellId: string) => Promise<void>;
  clearOutput: (cellId: string) => Promise<void>;
  clearAllOutputs: () => Promise<void>;

  restartKernel: (andRunAll?: boolean) => Promise<void>;
  interruptKernel: () => Promise<void>;

  setError: (error: string | null) => void;
};

// ── helpers ────────────────────────────────────────────────────────────────

const toCell = (row: any): Cell => ({
  id: row.id,
  type: row.type,
  source: row.source ?? "",
  language: row.language ?? "python",
  output: parseOutput(row.output),
  running: false,
});

const toNotebook = (row: any): Notebook => ({
  id: row.id,
  title: row.title,
  cells: (row.cells ?? [])
    .slice()
    .sort((a: any, b: any) => a.position - b.position)
    .map(toCell),
});

/**
 * Debounced persistence for cell source. Typing shouldn't produce one request
 * per keystroke, but we also can't wait for a blur that may never come (the tab
 * could be closed first).
 */
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const SAVE_DELAY_MS = 600;

export const useNotebookStore = create<NotebookStore>((set, get) => {
  /** Wraps a write so the save indicator and error banner stay accurate. */
  const track = async <T>(operation: () => Promise<T>): Promise<T | null> => {
    set((state) => ({ savingCount: state.savingCount + 1 }));
    try {
      return await operation();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Something went wrong";
      set({ error: message });
      return null;
    } finally {
      set((state) => ({ savingCount: Math.max(0, state.savingCount - 1) }));
    }
  };

  const activeNotebook = () => {
    const { notebooks, activeNotebookId } = get();
    return notebooks.find((notebook) => notebook.id === activeNotebookId);
  };

  /** Apply a change to the cells of the active notebook. */
  const patchCells = (update: (cells: Cell[]) => Cell[]) => {
    const notebookId = get().activeNotebookId;
    if (!notebookId) return;

    set((state) => ({
      notebooks: state.notebooks.map((notebook) =>
        notebook.id === notebookId
          ? { ...notebook, cells: update(notebook.cells) }
          : notebook,
      ),
    }));
  };

  const patchCell = (cellId: string, changes: Partial<Cell>) =>
    patchCells((cells) =>
      cells.map((cell) =>
        cell.id === cellId ? { ...cell, ...changes } : cell,
      ),
    );

  /** Push the current ordering to the server after a move or paste. */
  const persistOrder = async () => {
    const notebook = activeNotebook();
    if (!notebook) return;

    await track(() =>
      api.post("/api/cells/reorder", {
        notebook_id: notebook.id,
        cell_ids: notebook.cells.map((cell) => cell.id),
      }),
    );
  };

  const saveOutput = (cellId: string, output: CellOutput | null) =>
    track(() =>
      api.patch(`/api/cells/${cellId}`, { output: serializeOutput(output) }),
    );

  /** Runs one cell and stores its result. Returns false if it errored. */
  const execute = async (cellId: string): Promise<boolean> => {
    const notebook = activeNotebook();
    const cell = notebook?.cells.find((entry) => entry.id === cellId);

    if (!notebook || !cell || cell.type !== "code") return true;

    // Flush any pending keystrokes so we never run a stale version of the cell.
    const timer = saveTimers.get(cellId);
    if (timer) {
      clearTimeout(timer);
      saveTimers.delete(cellId);
      await track(() =>
        api.patch(`/api/cells/${cellId}`, { source: cell.source }),
      );
    }

    if (!cell.source.trim()) {
      patchCell(cellId, { output: null });
      await saveOutput(cellId, null);
      return true;
    }

    const count = (get().executionCount[notebook.id] ?? 0) + 1;

    set((state) => ({
      executionCount: { ...state.executionCount, [notebook.id]: count },
      kernelStatus: { ...state.kernelStatus, [notebook.id]: "busy" },
    }));

    patchCell(cellId, { running: true });

    try {
      const result = await api.post<CellOutput>("/api/execute", {
        language: cell.language ?? "python",
        code: cell.source,
        session_id: notebook.id, // one kernel per notebook
      });

      const output: CellOutput = { ...result, executionCount: count };

      patchCell(cellId, { output, running: false });
      await saveOutput(cellId, output);

      return output.status !== "error";
    } catch (error) {
      const output: CellOutput = {
        status: "error",
        stderr:
          error instanceof ApiError ? error.message : "Execution failed",
        executionCount: count,
      };

      patchCell(cellId, { output, running: false });
      await saveOutput(cellId, output);

      return false;
    } finally {
      set((state) => ({
        kernelStatus: { ...state.kernelStatus, [notebook.id]: "idle" },
      }));
    }
  };

  /** Run a list of cells in order, stopping at the first error like Jupyter. */
  const runSequence = async (cells: Cell[]) => {
    for (const cell of cells) {
      if (cell.type !== "code") continue;
      const ok = await execute(cell.id);
      if (!ok) break;
    }
  };

  return {
    notebooks: [],
    activeNotebookId: null,
    selectedCellId: null,
    mode: "command",
    pendingFocusId: null,
    isLoading: true,
    error: null,
    savingCount: 0,
    kernelStatus: {},
    executionCount: {},
    clipboard: null,
    trash: [],

    setError: (error) => set({ error }),

    consumeFocus: (cellId) => {
      if (get().pendingFocusId !== cellId) return false;
      set({ pendingFocusId: null });
      return true;
    },

    // ── loading ──────────────────────────────────────────────────────────
    loadNotebooks: async () => {
      set({ isLoading: true });

      try {
        const rows = await api.get<any[]>("/api/notebooks");
        const notebooks = rows.map(toNotebook);

        set({
          notebooks,
          activeNotebookId: notebooks[0]?.id ?? null,
          selectedCellId: notebooks[0]?.cells[0]?.id ?? null,
          isLoading: false,
        });

        // A brand new account has nothing to show; give it a notebook to type in.
        if (!notebooks.length) await get().createNotebook();
      } catch (error) {
        set({
          isLoading: false,
          error:
            error instanceof ApiError
              ? error.message
              : "Could not load your notebooks",
        });
      }
    },

    // ── notebooks ────────────────────────────────────────────────────────
    createNotebook: async (title, cells) => {
      const { notebooks } = get();

      const created = await track(() =>
        api.post<any>("/api/notebooks", {
          title: title ?? `Notebook ${notebooks.length + 1}`,
          cells: cells ?? [{ type: "code", source: "", language: "python" }],
        }),
      );

      if (!created) return;

      const notebook = toNotebook(created);

      set((state) => ({
        notebooks: [...state.notebooks, notebook],
        activeNotebookId: notebook.id,
        selectedCellId: notebook.cells[0]?.id ?? null,
        mode: "command",
      }));
    },

    renameNotebook: async (id, title) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      set((state) => ({
        notebooks: state.notebooks.map((notebook) =>
          notebook.id === id ? { ...notebook, title: trimmed } : notebook,
        ),
      }));

      await track(() => api.patch(`/api/notebooks/${id}`, { title: trimmed }));
    },

    deleteNotebook: async (id) => {
      const { notebooks, activeNotebookId } = get();
      const index = notebooks.findIndex((notebook) => notebook.id === id);
      const remaining = notebooks.filter((notebook) => notebook.id !== id);

      // Focus the neighbour the way a browser does when you close a tab.
      const nextActive =
        activeNotebookId === id
          ? (remaining[index] ?? remaining[index - 1])?.id ?? null
          : activeNotebookId;

      set({
        notebooks: remaining,
        activeNotebookId: nextActive,
        selectedCellId:
          remaining.find((notebook) => notebook.id === nextActive)?.cells[0]
            ?.id ?? null,
      });

      await track(() => api.delete(`/api/notebooks/${id}`));

      if (!remaining.length) await get().createNotebook();
    },

    setActiveNotebook: (id) => {
      const notebook = get().notebooks.find((entry) => entry.id === id);
      set({
        activeNotebookId: id,
        selectedCellId: notebook?.cells[0]?.id ?? null,
        mode: "command",
      });
    },

    // ── selection ────────────────────────────────────────────────────────
    selectCell: (id) => set({ selectedCellId: id }),
    setMode: (mode) => set({ mode }),

    selectRelative: (offset) => {
      const notebook = activeNotebook();
      const { selectedCellId } = get();
      if (!notebook?.cells.length) return;

      const current = notebook.cells.findIndex(
        (cell) => cell.id === selectedCellId,
      );

      const next = Math.min(
        Math.max(current + offset, 0),
        notebook.cells.length - 1,
      );

      set({ selectedCellId: notebook.cells[next].id });
    },

    // ── cells ────────────────────────────────────────────────────────────
    addCell: async (type, at) => {
      const notebook = activeNotebook();
      if (!notebook) return;

      const index = at ?? notebook.cells.length;

      const created = await track(() =>
        api.post<any>("/api/cells", {
          notebook_id: notebook.id,
          type,
          source: "",
          language: type === "code" ? "python" : "python",
          position: index,
        }),
      );

      if (!created) return;

      const cell = toCell(created);

      patchCells((cells) => {
        const next = [...cells];
        next.splice(index, 0, cell);
        return next;
      });

      // A new cell should be ready to type in. The editor claims pendingFocusId
      // once it has mounted (Monaco is not there yet at this point).
      set({ selectedCellId: cell.id, mode: "edit", pendingFocusId: cell.id });
      return cell.id;
    },

    addCellRelative: async (cellId, type, where) => {
      const notebook = activeNotebook();
      if (!notebook) return;

      const index = notebook.cells.findIndex((cell) => cell.id === cellId);
      if (index === -1) return get().addCell(type);

      return get().addCell(type, where === "above" ? index : index + 1);
    },

    updateCellSource: (cellId, source) => {
      patchCell(cellId, { source });

      const existing = saveTimers.get(cellId);
      if (existing) clearTimeout(existing);

      saveTimers.set(
        cellId,
        setTimeout(() => {
          saveTimers.delete(cellId);
          track(() => api.patch(`/api/cells/${cellId}`, { source }));
        }, SAVE_DELAY_MS),
      );
    },

    setCellType: async (cellId, type) => {
      patchCell(cellId, { type, output: null });
      await track(() =>
        api.patch(`/api/cells/${cellId}`, { type, output: "" }),
      );
    },

    setCellLanguage: async (cellId, language) => {
      patchCell(cellId, { language });
      await track(() => api.patch(`/api/cells/${cellId}`, { language }));
    },

    deleteCell: async (cellId) => {
      const notebook = activeNotebook();
      if (!notebook) return;

      const index = notebook.cells.findIndex((cell) => cell.id === cellId);
      if (index === -1) return;

      const cell = notebook.cells[index];
      const remaining = notebook.cells.filter((entry) => entry.id !== cellId);

      set((state) => ({
        notebooks: state.notebooks.map((entry) =>
          entry.id === notebook.id ? { ...entry, cells: remaining } : entry,
        ),
        // Keep a selection so the keyboard still has somewhere to go.
        selectedCellId:
          state.selectedCellId === cellId
            ? (remaining[index] ?? remaining[index - 1])?.id ?? null
            : state.selectedCellId,
        trash: [
          ...state.trash,
          { cell, notebookId: notebook.id, index },
        ].slice(-10),
      }));

      await track(() => api.delete(`/api/cells/${cellId}`));
    },

    undoDeleteCell: async () => {
      const { trash } = get();
      const last = trash[trash.length - 1];
      if (!last) return;

      set((state) => ({ trash: state.trash.slice(0, -1) }));

      const restored = await track(() =>
        api.post<any>("/api/cells", {
          notebook_id: last.notebookId,
          type: last.cell.type,
          source: last.cell.source,
          language: last.cell.language,
          position: last.index,
        }),
      );

      if (!restored) return;

      const cell = { ...toCell(restored), output: last.cell.output };

      set((state) => ({
        notebooks: state.notebooks.map((notebook) => {
          if (notebook.id !== last.notebookId) return notebook;
          const cells = [...notebook.cells];
          cells.splice(Math.min(last.index, cells.length), 0, cell);
          return { ...notebook, cells };
        }),
        selectedCellId: cell.id,
      }));

      if (last.cell.output) await saveOutput(cell.id, last.cell.output);
    },

    moveCell: async (cellId, direction) => {
      const notebook = activeNotebook();
      if (!notebook) return;

      const index = notebook.cells.findIndex((cell) => cell.id === cellId);
      const target = index + direction;

      if (index === -1 || target < 0 || target >= notebook.cells.length) return;

      patchCells((cells) => {
        const next = [...cells];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });

      await persistOrder();
    },

    // ── clipboard ────────────────────────────────────────────────────────
    copyCell: (cellId) => {
      const cell = activeNotebook()?.cells.find((entry) => entry.id === cellId);
      if (cell) set({ clipboard: { ...cell } });
    },

    cutCell: async (cellId) => {
      get().copyCell(cellId);
      await get().deleteCell(cellId);
    },

    pasteCell: async () => {
      const { clipboard, selectedCellId } = get();
      const notebook = activeNotebook();
      if (!clipboard || !notebook) return;

      const index = selectedCellId
        ? notebook.cells.findIndex((cell) => cell.id === selectedCellId) + 1
        : notebook.cells.length;

      const created = await track(() =>
        api.post<any>("/api/cells", {
          notebook_id: notebook.id,
          type: clipboard.type,
          source: clipboard.source,
          language: clipboard.language,
          position: index,
        }),
      );

      if (!created) return;

      const cell = toCell(created);

      patchCells((cells) => {
        const next = [...cells];
        next.splice(index, 0, cell);
        return next;
      });

      set({ selectedCellId: cell.id });
    },

    // ── execution ────────────────────────────────────────────────────────
    runCell: async (cellId) => {
      await execute(cellId);
    },

    /**
     * Shift+Enter. Run, then move on — and when this is the last cell, append a
     * fresh one rather than sitting still, which is what Jupyter does and what
     * makes it possible to work straight down a notebook without reaching for
     * the mouse.
     */
    runAndAdvance: async (cellId) => {
      await execute(cellId);

      const notebook = activeNotebook();
      if (!notebook) return;

      const index = notebook.cells.findIndex((cell) => cell.id === cellId);
      if (index === -1) return;

      const next = notebook.cells[index + 1];

      if (next) {
        set({ selectedCellId: next.id, mode: "command" });
      } else {
        await get().addCell("code", index + 1);
      }
    },

    /** Alt+Enter: run and always open a new cell underneath. */
    runAndInsertBelow: async (cellId) => {
      await execute(cellId);

      const notebook = activeNotebook();
      if (!notebook) return;

      const index = notebook.cells.findIndex((cell) => cell.id === cellId);
      await get().addCell("code", index === -1 ? undefined : index + 1);
    },

    runAll: async () => {
      const notebook = activeNotebook();
      if (notebook) await runSequence(notebook.cells);
    },

    runAllAbove: async (cellId) => {
      const notebook = activeNotebook();
      if (!notebook) return;

      const index = notebook.cells.findIndex((cell) => cell.id === cellId);
      if (index > 0) await runSequence(notebook.cells.slice(0, index));
    },

    runAllBelow: async (cellId) => {
      const notebook = activeNotebook();
      if (!notebook) return;

      const index = notebook.cells.findIndex((cell) => cell.id === cellId);
      if (index !== -1) await runSequence(notebook.cells.slice(index));
    },

    clearOutput: async (cellId) => {
      patchCell(cellId, { output: null });
      await saveOutput(cellId, null);
    },

    clearAllOutputs: async () => {
      const notebook = activeNotebook();
      if (!notebook) return;

      const withOutput = notebook.cells.filter((cell) => cell.output);

      patchCells((cells) =>
        cells.map((cell) => ({ ...cell, output: null, running: false })),
      );

      set((state) => ({
        executionCount: { ...state.executionCount, [notebook.id]: 0 },
      }));

      await Promise.all(withOutput.map((cell) => saveOutput(cell.id, null)));
    },

    // ── kernel ───────────────────────────────────────────────────────────
    restartKernel: async (andRunAll = false) => {
      const notebook = activeNotebook();
      if (!notebook) return;

      set((state) => ({
        kernelStatus: { ...state.kernelStatus, [notebook.id]: "starting" },
        executionCount: { ...state.executionCount, [notebook.id]: 0 },
      }));

      await track(() =>
        api.post("/api/kernel/restart", { session_id: notebook.id }),
      );

      set((state) => ({
        kernelStatus: { ...state.kernelStatus, [notebook.id]: "idle" },
      }));

      if (andRunAll) await get().runAll();
    },

    interruptKernel: async () => {
      const notebook = activeNotebook();
      if (!notebook) return;

      const running = notebook.cells.find((cell) => cell.running);

      const response = await track(() =>
        api.post<{ success: boolean; message: string }>(
          "/api/kernel/interrupt",
          {
            session_id: notebook.id,
            language: running?.language ?? "python",
          },
        ),
      );

      if (response && !response.success) set({ error: response.message });
    },
  };
});
