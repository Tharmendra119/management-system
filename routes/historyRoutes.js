const express = require("express");
const router = express.Router();
const db = require("../config/db"); // adjust if your db path is different

// GET ALL HISTORY
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        product_id,
        product_name,
        action_type,
        previous_value,
        new_value,
        changed_at
      FROM product_history
      ORDER BY changed_at DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

module.exports = router;