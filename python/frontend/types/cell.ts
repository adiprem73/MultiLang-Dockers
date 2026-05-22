export type Cell = {
    id: string;
    type: "code" | "markdown";
    language?: string;
    code: string;
    output?: string;
  };