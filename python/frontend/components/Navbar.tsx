import { AppBar, Toolbar, Typography, IconButton, Box } from "@mui/material";
import { Code, PlayArrow, Save, Download } from "@mui/icons-material";

export default function Navbar() {
  return (
    <AppBar
      position="static"
      sx={{
        bgcolor: "rgba(10, 10, 15, 0.7)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0, 255, 255, 0.2)",
        boxShadow: "0 4px 30px rgba(0, 255, 255, 0.1)",
      }}
    >
      <Toolbar>
        <Code
          sx={{
            mr: 2,
            color: "#00ffff",
            filter: "drop-shadow(0 0 8px #00ffff)",
          }}
        />
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            color: "#fff",
            textShadow: "0 0 10px rgba(0, 255, 255, 0.5)",
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          CodeNotebook
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            color="inherit"
            size="small"
            sx={{
              color: "#00ff88",
              filter: "drop-shadow(0 0 6px #00ff88)",
              "&:hover": {
                bgcolor: "rgba(0, 255, 136, 0.1)",
                filter: "drop-shadow(0 0 12px #00ff88)",
              },
            }}
          >
            <PlayArrow />
          </IconButton>
          <IconButton
            color="inherit"
            size="small"
            sx={{
              color: "#00ffff",
              filter: "drop-shadow(0 0 6px #00ffff)",
              "&:hover": {
                bgcolor: "rgba(0, 255, 255, 0.1)",
                filter: "drop-shadow(0 0 12px #00ffff)",
              },
            }}
          >
            <Save />
          </IconButton>
          <IconButton
            color="inherit"
            size="small"
            sx={{
              color: "#ff00ff",
              filter: "drop-shadow(0 0 6px #ff00ff)",
              "&:hover": {
                bgcolor: "rgba(255, 0, 255, 0.1)",
                filter: "drop-shadow(0 0 12px #ff00ff)",
              },
            }}
          >
            <Download />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
