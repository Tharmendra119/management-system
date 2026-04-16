const db = require("../config/db");

exports.getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    // ✅ FIXED: use LIMIT + OFFSET
    const [rows] = await db.query(`
      SELECT 
        product_name,
        action_type,
        previous_value,
        new_value,
        changed_at
      FROM product_history
      ORDER BY changed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // ✅ ALSO ADD total count (needed for pagination)
    const [[countResult]] = await db.query(`
      SELECT COUNT(*) AS total FROM product_history
    `);

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // ✅ RETURN structured response
    res.json({
      history: rows,
      total,
      page,
      totalPages
    });

  } catch (err) {
    console.log("History Error:", err);
    res.status(500).json({ error: "Database error" });
  }
};