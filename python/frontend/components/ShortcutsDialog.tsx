"use client";

import {
  alpha,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  useTheme,
} from "@mui/material";

const COMMAND_MODE: [string, string][] = [
  ["Enter", "Edit the selected cell"],
  ["↑ / K", "Select cell above"],
  ["↓ / J", "Select cell below"],
  ["A", "Insert cell above"],
  ["B", "Insert cell below"],
  ["M", "Change cell to markdown"],
  ["Y", "Change cell to code"],
  ["D, D", "Delete cell"],
  ["Z", "Undo cell deletion"],
  ["C / X / V", "Copy / cut / paste cell"],
  ["O", "Clear cell output"],
  ["0, 0", "Restart the kernel"],
  ["I, I", "Interrupt the kernel"],
  ["H", "Show this help"],
];

const ANY_MODE: [string, string][] = [
  ["Shift + Enter", "Run cell, select the next one"],
  ["Ctrl/⌘ + Enter", "Run cell, stay put"],
  ["Alt + Enter", "Run cell, insert a new one below"],
  ["Esc", "Leave edit mode"],
];

const Key = ({ children }: { children: string }) => (
  <Box
    component="kbd"
    sx={(theme) => ({
      display: "inline-block",
      px: 0.75,
      py: 0.25,
      fontFamily: "var(--font-geist-mono), monospace",
      fontSize: 11,
      color: "primary.main",
      bgcolor: alpha(theme.palette.primary.main, 0.08),
      border: "1px solid",
      borderColor: alpha(theme.palette.primary.main, 0.25),
      borderRadius: 0.75,
      whiteSpace: "nowrap",
    })}
  >
    {children}
  </Box>
);

const Section = ({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) => (
  <Box sx={{ mb: 3 }}>
    <Typography
      sx={{
        fontSize: 11,
        letterSpacing: 1.5,
        color: "primary.main",
        fontWeight: 700,
        mb: 1.5,
      }}
    >
      {title.toUpperCase()}
    </Typography>

    {rows.map(([keys, description]) => (
      <Box
        key={keys}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          py: 0.6,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          {description}
        </Typography>
        <Key>{keys}</Key>
      </Box>
    ))}
  </Box>
);

export default function ShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: alpha(theme.palette.primary.main, 0.2),
            backgroundImage: "none",
          },
        },
      }}
    >
      <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>
        Keyboard shortcuts
        <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}>
          A muted bar means the cell is selected; a bright bar means you&apos;re
          typing in it. Press Esc to step back out.
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Section title="Running cells" rows={ANY_MODE} />
        <Section title="Command mode (press Esc first)" rows={COMMAND_MODE} />
      </DialogContent>
    </Dialog>
  );
}
