const db = require("../config/db");

// ✅ STOCK IN
exports.stockIn = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    // Validation (same logic)
    if (!product_id || !quantity) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const sql = "UPDATE products SET quantity = quantity + ? WHERE id = ?";

    await db.query(sql, [quantity, product_id]);

    res.json({ message: "Stock added" });

  } catch (err) {
    console.log("Stock In Error:", err);
    return res.status(500).json({ error: "Database error" });
  }
};

// ✅ STOCK OUT
exports.stockOut = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    // Validation (same logic)
    if (!product_id || !quantity) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const sql = "UPDATE products SET quantity = quantity - ? WHERE id = ?";

    await db.query(sql, [quantity, product_id]);

    res.json({ message: "Stock removed" });

  } catch (err) {
    console.log("Stock Out Error:", err);
    return res.status(500).json({ error: "Database error" });
  }
};