"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  alpha,
  AppBar,
  Box,
  Divider,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Code,
  DarkMode,
  Download,
  FastForward,
  Help,
  LayersClear,
  LightMode,
  Logout,
  PlayArrow,
  RestartAlt,
  Stop,
  Upload,
} from "@mui/icons-material";

import { supabase } from "@/lib/supabase";
import { useNotebookStore } from "@/store/notebookStore";
import { useThemeStore } from "@/store/themeStore";
import { downloadIpynb, ipynbToCells } from "@/lib/ipynb";
import NotebookTabs from "./NotebookTabs";

export default function Navbar({
  onShowShortcuts,
}: {
  onShowShortcuts: () => void;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const theme = useTheme();
  const nb = theme.palette.notebook;
  const isDark = theme.palette.mode === "dark";

  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);

  const notebooks = useNotebookStore((state) => state.notebooks);
  const activeNotebookId = useNotebookStore((state) => state.activeNotebookId);
  const kernelStatus = useNotebookStore((state) => state.kernelStatus);
  const savingCount = useNotebookStore((state) => state.savingCount);
  const runAll = useNotebookStore((state) => state.runAll);
  const restartKernel = useNotebookStore((state) => state.restartKernel);
  const interruptKernel = useNotebookStore((state) => state.interruptKernel);
  const clearAllOutputs = useNotebookStore((state) => state.clearAllOutputs);
  const createNotebook = useNotebookStore((state) => state.createNotebook);
  const setError = useNotebookStore((state) => state.setError);

  const notebook = notebooks.find((entry) => entry.id === activeNotebookId);
  const status = activeNotebookId
    ? kernelStatus[activeNotebookId] ?? "idle"
    : "idle";

  const busy = status === "busy";

  const button = (color: string) => ({
    color,
    p: 0.75,
    "&:hover": { bgcolor: alpha(color, 0.12) },
    "&.Mui-disabled": { color: "action.disabled" },
  });

  const handleImport = async (file: File) => {
    try {
      const cells = ipynbToCells(JSON.parse(await file.text()));
      await createNotebook(file.name.replace(/\.ipynb$/i, ""), cells);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not import that file.",
      );
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: nb.appBar,
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid",
        borderColor: alpha(theme.palette.primary.main, isDark ? 0.15 : 0.2),
        color: "text.primary",
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 48, px: 2, gap: 0.5 }}>
        <Code sx={{ mr: 1, color: "primary.main", fontSize: 20 }} />
        <Typography
          sx={{
            fontWeight: 700,
            letterSpacing: 1.2,
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
          }}
        >
          CodeNotebook
        </Typography>

        <Divider orientation="vertical" flexItem sx={{ mx: 1.5, my: 1 }} />

        <Tooltip title="Run all cells">
          <span>
            <IconButton
              size="small"
              onClick={() => runAll()}
              disabled={!notebook || busy}
              sx={button(theme.palette.secondary.main)}
            >
              <FastForward fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Interrupt kernel (I,I)">
          <span>
            <IconButton
              size="small"
              onClick={() => interruptKernel()}
              disabled={!busy}
              sx={button(theme.palette.error.main)}
            >
              <Stop fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Restart kernel (0,0)">
          <span>
            <IconButton
              size="small"
              onClick={() => restartKernel()}
              disabled={!notebook}
              sx={button(theme.palette.warning.main)}
            >
              <RestartAlt fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Restart kernel and run all cells">
          <span>
            <IconButton
              size="small"
              onClick={() => restartKernel(true)}
              disabled={!notebook}
              sx={button(theme.palette.primary.main)}
            >
              <PlayArrow fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Clear all outputs">
          <span>
            <IconButton
              size="small"
              onClick={() => clearAllOutputs()}
              disabled={!notebook}
              sx={button(theme.palette.text.secondary)}
            >
              <LayersClear fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />

        {/* Autosave means there is no save button; say so instead of pretending. */}
        <Typography
          sx={{
            fontSize: 11,
            color: "text.disabled",
            mr: 1.5,
            minWidth: 52,
            textAlign: "right",
          }}
        >
          {savingCount > 0 ? "Saving…" : "Saved"}
        </Typography>

        <KernelBadge status={status} />

        <Divider orientation="vertical" flexItem sx={{ mx: 1.5, my: 1 }} />

        <Tooltip title={isDark ? "Switch to light theme" : "Switch to dark theme"}>
          <IconButton
            size="small"
            onClick={toggleMode}
            aria-label={
              isDark ? "Switch to light theme" : "Switch to dark theme"
            }
            sx={button(theme.palette.text.secondary)}
          >
            {mode === "dark" ? (
              <LightMode fontSize="small" />
            ) : (
              <DarkMode fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Import .ipynb">
          <IconButton
            size="small"
            onClick={() => fileInput.current?.click()}
            sx={button(theme.palette.primary.main)}
          >
            <Upload fontSize="small" />
          </IconButton>
        </Tooltip>

        <input
          ref={fileInput}
          type="file"
          accept=".ipynb,application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleImport(file);
            event.target.value = "";
          }}
        />

        <Tooltip title="Download as .ipynb">
          <span>
            <IconButton
              size="small"
              onClick={() => notebook && downloadIpynb(notebook)}
              disabled={!notebook}
              sx={button(nb.accentAlt)}
            >
              <Download fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Keyboard shortcuts (H)">
          <IconButton
            size="small"
            onClick={onShowShortcuts}
            sx={button(theme.palette.text.secondary)}
          >
            <Help fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Sign out">
          <IconButton
            size="small"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
            sx={button(theme.palette.error.main)}
          >
            <Logout fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          px: 1,
          borderTop: "1px solid",
          borderColor: "divider",
          minHeight: 36,
        }}
      >
        <NotebookTabs />
      </Box>
    </AppBar>
  );
}

function KernelBadge({ status }: { status: string }) {
  const theme = useTheme();

  const colors: Record<string, string> = {
    busy: theme.palette.warning.main,
    starting: theme.palette.warning.main,
    idle: theme.palette.secondary.main,
    stopped: theme.palette.text.disabled,
  };

  const color = colors[status] ?? colors.idle;
  const pulsing = status === "busy" || status === "starting";

  return (
    <Tooltip title={`Kernel ${status}`}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: color,
            boxShadow: `0 0 8px ${alpha(color, 0.8)}`,
            animation: pulsing ? "pulse 1s ease-in-out infinite" : "none",
            "@keyframes pulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.3 },
            },
          }}
        />
        <Typography
          sx={{
            fontSize: 11,
            color: "text.secondary",
            textTransform: "capitalize",
            minWidth: 40,
          }}
        >
          {status}
        </Typography>
      </Box>
    </Tooltip>
  );
}
