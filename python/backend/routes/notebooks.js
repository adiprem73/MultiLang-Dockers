const express = require("express");
const router = express.Router();

const CELL_FIELDS = "id, type, source, output, language, position";

// GET /api/notebooks — every notebook for the signed-in user, cells in order
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("notebooks")
      .select(`*, cells(${CELL_FIELDS}, created_at, updated_at)`)
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true })
      .order("position", { ascending: true, foreignTable: "cells" });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST /api/notebooks — create a notebook, optionally seeded with cells
// (used by both "new notebook" and .ipynb import)
router.post("/", async (req, res, next) => {
  try {
    const { title, cells = [] } = req.body;

    const { data: notebook, error } = await req.supabase
      .from("notebooks")
      .insert({
        title: title?.trim() || "Untitled Notebook",
        user_id: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    let created = [];

    if (cells.length) {
      const rows = cells.map((cell, index) => ({
        notebook_id: notebook.id,
        user_id: req.user.id,
        type: cell.type === "markdown" ? "markdown" : "code",
        source: cell.source ?? "",
        output: cell.output ?? "",
        language: cell.language ?? "python",
        position: index,
      }));

      const { data, error: cellError } = await req.supabase
        .from("cells")
        .insert(rows)
        .select(CELL_FIELDS);

      if (cellError) throw cellError;
      created = data;
    }

    res.status(201).json({ ...notebook, cells: created });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notebooks/:id — rename
router.patch("/:id", async (req, res, next) => {
  try {
    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Title cannot be empty" });
    }

    // maybeSingle, not single: a notebook belonging to someone else matches zero
    // rows, and that is a 404 — not a 500.
    const { data, error } = await req.supabase
      .from("notebooks")
      .update({ title: title.trim() })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Notebook not found" });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notebooks/:id — cells cascade
router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await req.supabase
      .from("notebooks")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
