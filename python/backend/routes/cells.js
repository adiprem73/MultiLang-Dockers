const express = require("express");
const router = express.Router();

const CELL_FIELDS = "id, type, source, output, language, position";
const EDITABLE = ["source", "output", "language", "type", "position"];

// POST /api/cells/reorder — persist a whole ordering at once.
// Declared before "/:id" routes so "reorder" isn't swallowed as an id.
router.post("/reorder", async (req, res, next) => {
  try {
    const { notebook_id, cell_ids } = req.body;

    if (!notebook_id || !Array.isArray(cell_ids)) {
      return res
        .status(400)
        .json({ error: "notebook_id and cell_ids[] are required" });
    }

    await Promise.all(
      cell_ids.map((id, position) =>
        req.supabase
          .from("cells")
          .update({ position })
          .eq("id", id)
          .eq("notebook_id", notebook_id)
          .eq("user_id", req.user.id)
          .then(({ error }) => {
            if (error) throw error;
          }),
      ),
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/cells — insert a cell, pushing everything below it down.
// Without the shift, two cells end up sharing a position and the notebook
// silently reorders itself on the next load.
router.post("/", async (req, res, next) => {
  try {
    const { notebook_id, type, source, language, position } = req.body;

    if (!notebook_id) {
      return res.status(400).json({ error: "notebook_id is required" });
    }

    const { data: siblings, error: readError } = await req.supabase
      .from("cells")
      .select("id, position")
      .eq("notebook_id", notebook_id)
      .eq("user_id", req.user.id)
      .order("position", { ascending: true });

    if (readError) throw readError;

    const index =
      Number.isInteger(position) && position >= 0
        ? Math.min(position, siblings.length)
        : siblings.length;

    await Promise.all(
      siblings.slice(index).map((cell, offset) =>
        req.supabase
          .from("cells")
          .update({ position: index + offset + 1 })
          .eq("id", cell.id)
          .eq("user_id", req.user.id)
          .then(({ error }) => {
            if (error) throw error;
          }),
      ),
    );

    const { data, error } = await req.supabase
      .from("cells")
      .insert({
        notebook_id,
        user_id: req.user.id,
        type: type === "markdown" ? "markdown" : "code",
        source: source ?? "",
        output: "",
        language: language ?? "python",
        position: index,
      })
      .select(CELL_FIELDS)
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/cells/:id — update source, output, language or type
router.patch("/:id", async (req, res, next) => {
  try {
    const updates = {};

    for (const field of EDITABLE) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    // maybeSingle, not single: a cell belonging to someone else matches zero
    // rows, and that is a 404 — not a 500.
    const { data, error } = await req.supabase
      .from("cells")
      .update(updates)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select(CELL_FIELDS)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Cell not found" });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cells/:id — remaining cells keep their relative order, so the
// resulting gap in positions is harmless; the client re-packs on the next move.
router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await req.supabase
      .from("cells")
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
