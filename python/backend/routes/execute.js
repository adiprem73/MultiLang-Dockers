const express = require("express");
const router = express.Router();

const kernelManager = require("../services/kernelManager");
const { runBatch, BATCH_LANGUAGES } = require("../services/batchRunner");

const LANGUAGES = ["python", "javascript", "cpp", "java"];

// POST /api/execute — run one cell
router.post("/execute", async (req, res, next) => {
  const { language, code = "", session_id: sessionId = "default" } = req.body;

  if (!LANGUAGES.includes(language)) {
    return res.status(400).json({
      error: `Unsupported language: ${language}. Expected one of ${LANGUAGES.join(", ")}.`,
    });
  }

  const startedAt = Date.now();

  try {
    const result = BATCH_LANGUAGES.includes(language)
      ? await runBatch(language, code)
      : await kernelManager.run(req.user.id, sessionId, language, code);

    res.json({ ...result, durationMs: Date.now() - startedAt });
  } catch (error) {
    // A failed *execution* is a normal outcome, not an HTTP error: report it in
    // the same shape as a successful run so the cell can render it as output.
    res.json({
      status: "error",
      stdout: "",
      stderr: error.message,
      result: null,
      durationMs: Date.now() - startedAt,
    });
  }
});

// POST /api/kernel/restart — clears all variables for this notebook's kernels
router.post("/kernel/restart", async (req, res, next) => {
  try {
    const { session_id: sessionId = "default", language } = req.body;
    await kernelManager.restart(req.user.id, sessionId, language);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/kernel/interrupt — SIGINT a running cell, keeping variables alive
router.post("/kernel/interrupt", (req, res) => {
  const { session_id: sessionId = "default", language = "python" } = req.body;
  const interrupted = kernelManager.interrupt(req.user.id, sessionId, language);

  res.json({
    success: interrupted,
    // JavaScript can't be interrupted mid-loop; the client offers a restart.
    message: interrupted
      ? "Interrupt sent"
      : `${language} cannot be interrupted — restart the kernel instead.`,
  });
});

// GET /api/kernel/status
router.get("/kernel/status", (req, res) => {
  const { session_id: sessionId = "default", language = "python" } = req.query;

  res.json({
    status: kernelManager.status(req.user.id, sessionId, language),
  });
});

module.exports = router;
