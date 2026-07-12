const express = require("express");
const cors = require("cors");

const config = require("./config");
const { requireAuth } = require("./middleware/auth");
const kernelManager = require("./services/kernelManager");

const notebooksRouter = require("./routes/notebooks");
const cellsRouter = require("./routes/cells");
const executeRouter = require("./routes/execute");

const app = express();

app.use(
  cors({
    origin: config.ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  }),
);

app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, kernels: kernelManager.stats() });
});

// Everything below runs as the signed-in user. Code execution is authenticated
// too: an open /execute would let anyone who can reach this port run arbitrary
// code inside our containers.
app.use("/api/notebooks", requireAuth, notebooksRouter);
app.use("/api/cells", requireAuth, cellsRouter);
app.use("/api", requireAuth, executeRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    error: error.message || "Internal server error",
  });
});

const server = app.listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}`);
  console.log(`Allowed origins: ${config.ALLOWED_ORIGINS.join(", ")}`);
});

// Kernels are long-lived containers; leaving them behind on shutdown is how you
// end up with a machine full of orphaned notebook_* containers.
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${signal} received — stopping kernels...`);
  server.close();
  await kernelManager.disposeAll();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
