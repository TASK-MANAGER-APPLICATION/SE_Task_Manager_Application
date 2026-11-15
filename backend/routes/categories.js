const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const MAX_POSTGRES_BIGINT = "9223372036854775807";

router.use(authMiddleware);

function isValidCategoryId(id) {
  return (
    typeof id === "string" &&
    /^[1-9]\d*$/.test(id) &&
    (id.length < MAX_POSTGRES_BIGINT.length ||
      (id.length === MAX_POSTGRES_BIGINT.length &&
        id <= MAX_POSTGRES_BIGINT))
  );
}

function getCategoryName(value) {
  if (typeof value !== "string") {
    return null;
  }

  const name = value.trim();
  return name && Array.from(name).length <= 255 ? name : null;
}

function sendInvalidName(res) {
  return res.status(400).json({
    code: "INVALID_CATEGORY_NAME",
    message: "Category name must be between 1 and 255 characters.",
  });
}

function sendDuplicateName(res) {
  return res.status(409).json({
    code: "DUPLICATE_CATEGORY",
    message: "A category with this name already exists.",
  });
}

router.post("/", async (req, res) => {
  const name = getCategoryName(req.body?.name);
  if (name === null) {
    return sendInvalidName(res);
  }

  try {
    const result = await pool.query(
      `INSERT INTO categories (user_id, name)
       VALUES ($1, $2)
       RETURNING id, name`,
      [req.user.id, name]
    );
    return res.status(201).json({ category: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return sendDuplicateName(res);
    }

    console.error("Create category failed:", error.message);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to create category.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name
       FROM categories
       WHERE user_id = $1
       ORDER BY name ASC, id ASC`,
      [req.user.id]
    );
    return res.status(200).json({ categories: result.rows });
  } catch (error) {
    console.error("List categories failed:", error.message);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to retrieve categories.",
    });
  }
});

router.put("/:id", async (req, res) => {
  if (!isValidCategoryId(req.params.id)) {
    return res.status(400).json({
      code: "INVALID_CATEGORY_ID",
      message: "Category ID must be a positive whole number.",
    });
  }

  const name = getCategoryName(req.body?.name);
  if (name === null) {
    return sendInvalidName(res);
  }

  try {
    const result = await pool.query(
      `UPDATE categories
       SET name = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, name`,
      [name, req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found.",
      });
    }

    return res.status(200).json({ category: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return sendDuplicateName(res);
    }

    console.error("Rename category failed:", error.message);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to rename category.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  if (!isValidCategoryId(req.params.id)) {
    return res.status(400).json({
      code: "INVALID_CATEGORY_ID",
      message: "Category ID must be a positive whole number.",
    });
  }

  try {
    const result = await pool.query(
      "DELETE FROM categories WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found.",
      });
    }

    return res.status(204).end();
  } catch (error) {
    console.error("Delete category failed:", error.message);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to delete category.",
    });
  }
});

module.exports = router;
