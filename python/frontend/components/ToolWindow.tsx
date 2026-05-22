import {
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from "@mui/material";
import { PlayArrow, DeleteSweep, Add } from "@mui/icons-material";

interface ToolWindowProps {
  onRunAllBelow: (index: number) => void;
  onDeleteAllBelow: (index: number) => void;
  onAddCell: () => void;
  selectedCellIndex: number | null;
}

export default function ToolWindow({
  onRunAllBelow,
  onDeleteAllBelow,
  onAddCell,
  selectedCellIndex,
}: ToolWindowProps) {
  return (
    <Paper
      sx={{
        width: 250,
        bgcolor: "rgba(15, 15, 20, 0.6)",
        backdropFilter: "blur(20px)",
        color: "#fff",
        height: "100%",
        borderRadius: 0,
        borderLeft: "1px solid rgba(0, 255, 255, 0.2)",
        boxShadow: "-4px 0 30px rgba(0, 255, 255, 0.1)",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          p: 2,
          color: "#00ffff",
          fontWeight: 600,
          textShadow: "0 0 10px rgba(0, 255, 255, 0.8)",
          letterSpacing: 1,
        }}
      >
        Tools
      </Typography>
      <Divider sx={{ bgcolor: "rgba(0, 255, 255, 0.2)" }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={onAddCell}
            sx={{
              "&:hover": {
                bgcolor: "rgba(0, 255, 255, 0.1)",
              },
            }}
          >
            <ListItemIcon>
              <Add
                sx={{
                  color: "#00ffff",
                  filter: "drop-shadow(0 0 6px #00ffff)",
                }}
              />
            </ListItemIcon>
            <ListItemText primary="Add New Cell" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() =>
              selectedCellIndex !== null && onRunAllBelow(selectedCellIndex)
            }
            disabled={selectedCellIndex === null}
            sx={{
              "&:hover": {
                bgcolor: "rgba(0, 255, 136, 0.1)",
              },
            }}
          >
            <ListItemIcon>
              <PlayArrow
                sx={{
                  color:
                    selectedCellIndex !== null
                      ? "#00ff88"
                      : "rgba(255, 255, 255, 0.3)",
                  filter:
                    selectedCellIndex !== null
                      ? "drop-shadow(0 0 6px #00ff88)"
                      : "none",
                }}
              />
            </ListItemIcon>
            <ListItemText primary="Run All Below" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() =>
              selectedCellIndex !== null && onDeleteAllBelow(selectedCellIndex)
            }
            disabled={selectedCellIndex === null}
            sx={{
              "&:hover": {
                bgcolor: "rgba(255, 0, 100, 0.1)",
              },
            }}
          >
            <ListItemIcon>
              <DeleteSweep
                sx={{
                  color:
                    selectedCellIndex !== null
                      ? "#ff0066"
                      : "rgba(255, 255, 255, 0.3)",
                  filter:
                    selectedCellIndex !== null
                      ? "drop-shadow(0 0 6px #ff0066)"
                      : "none",
                }}
              />
            </ListItemIcon>
            <ListItemText primary="Delete All Below" />
          </ListItemButton>
        </ListItem>
      </List>
    </Paper>
  );
}
