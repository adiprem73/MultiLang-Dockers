"use client";

import { alpha, Box, IconButton, Tooltip, Typography, useTheme } from "@mui/material";
import { Close } from "@mui/icons-material";
import { CellOutput, isEmptyOutput } from "@/types/cell";

const MONO = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: 13,
  lineHeight: 1.55,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
  margin: 0,
};

const Stream = ({ text, color }: { text: string; color: string }) => (
  <Box component="pre" sx={{ ...MONO, color }}>
    {text.replace(/\n$/, "")}
  </Box>
);

type Props = {
  output: CellOutput;
  onClear: () => void;
};

export default function OutputArea({ output, onClear }: Props) {
  const theme = useTheme();
  const nb = theme.palette.notebook;

  if (isEmptyOutput(output)) return null;

  const failed = output.status === "error";
  const edge = failed ? theme.palette.error.main : theme.palette.primary.main;

  return (
    <Box
      sx={{
        mt: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: failed ? alpha(theme.palette.error.main, 0.35) : nb.cellBorder,
        borderLeft: `3px solid ${failed ? edge : alpha(edge, 0.6)}`,
        bgcolor: nb.output,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 1.5,
          py: 0.5,
          borderBottom: "1px solid",
          borderColor: nb.cellBorder,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: failed ? theme.palette.error.main : alpha(edge, 0.85),
            letterSpacing: 1.2,
            fontWeight: 600,
            fontSize: 10,
          }}
        >
          {failed ? "ERROR" : "OUTPUT"}
        </Typography>

        {output.durationMs !== undefined && (
          <Typography
            variant="caption"
            sx={{ ml: 1.5, color: "text.disabled", fontSize: 10 }}
          >
            {output.durationMs < 1000
              ? `${output.durationMs} ms`
              : `${(output.durationMs / 1000).toFixed(2)} s`}
          </Typography>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Clear output" placement="top">
          <IconButton
            size="small"
            onClick={onClear}
            sx={{
              p: 0.25,
              color: "text.disabled",
              "&:hover": { color: "text.primary" },
            }}
          >
            <Close sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          p: 1.5,
          maxHeight: 420,
          overflow: "auto",
          "&::-webkit-scrollbar": { width: 8, height: 8 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: nb.scrollbar,
            borderRadius: 4,
          },
        }}
      >
        {output.stdout && <Stream text={output.stdout} color={nb.outputText} />}
        {output.stderr && <Stream text={output.stderr} color={nb.stderr} />}

        {/* The value of a trailing expression, echoed the way Jupyter does. */}
        {output.result && (
          <Box sx={{ display: "flex", gap: 1, mt: output.stdout ? 1 : 0 }}>
            <Typography
              component="span"
              sx={{ ...MONO, color: nb.prompt, flexShrink: 0 }}
            >
              {output.executionCount ? `Out[${output.executionCount}]:` : "Out:"}
            </Typography>
            <Stream text={output.result} color={nb.result} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
