import { Cell } from "./cell";

export type KernelStatus = "stopped" | "starting" | "idle" | "busy";

export type Notebook = {
  id: string;
  title: string;
  cells: Cell[];
};
