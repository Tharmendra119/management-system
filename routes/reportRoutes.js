const express = require("express");
const router = express.Router();
const db = require("../config/db"); // ⚠️ make sure path is correct
const XLSX = require("xlsx");
const reportController = require("../controllers/reportController");

router.get("/history", reportController.getHistory);

// ✅ Stock Summary
router.get("/", async (req, res) => {

  const sql = "SELECT * FROM products";

  try {
    const [result] = await db.query(sql);

    console.log("✅ PRODUCTS DATA:", result); // 🔥 DEBUG

    res.json(result);

  } catch (err) {
    console.log("❌ STOCK SUMMARY ERROR:", err); // 🔥 IMPORTANT
    res.status(500).json({ error: "Database error" });
  }

});

// ✅ Sales
router.get("/sales", async (req, res) => {

  const sql = `
  SELECT 
    s.id,
    p.name,
    s.quantity,
    s.price,
    s.total,
    s.sold_at
  FROM sales s
  JOIN products p ON s.product_id = p.id
  ORDER BY s.sold_at DESC
  `;

  try {
    const [result] = await db.query(sql);

    console.log("✅ SALES DATA:", result); // DEBUG

    res.json(result);

  } catch (err) {
    console.log("❌ SALES ERROR:", err); // DEBUG
    res.status(500).json({ error: "Database error" });
  }

});

// ✅ Low Stock
router.get("/low-stock", async (req, res) => {

  const sql = `
  SELECT * 
  FROM products
  WHERE quantity < 5
  ORDER BY quantity ASC
  `;

  try {
    const [result] = await db.query(sql);

    console.log("✅ LOW STOCK DATA:", result); // DEBUG

    res.json(result);

  } catch (err) {
    console.log("❌ LOW STOCK ERROR:", err); // DEBUG
    res.status(500).json({ error: "Database error" });
  }

});


//summary
  router.get("/summary", async (req, res) => {
  try {
    const [[totalProducts]] = await db.query(
      "SELECT COUNT(*) as count FROM products"
    );

    const [[totalStock]] = await db.query(
      "SELECT SUM(quantity) as total FROM products"
    );

    const [[lowStock]] = await db.query(
      "SELECT COUNT(*) as count FROM products WHERE quantity < 5"
    );

    res.json({
      totalProducts: totalProducts.count,
      totalStock: totalStock.total || 0,
      lowStock: lowStock.count
    });

  } catch (err) {
    res.status(500).json(err);
  }
});

// ✅ Export
router.get("/export", async (req, res) => {

  const sql = "SELECT * FROM products";

  try {
    const [result] = await db.query(sql);

    const worksheet = XLSX.utils.json_to_sheet(result);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=reports.xlsx"
    );

    res.send(buffer);

  } catch (err) {
    console.log("❌ EXPORT ERROR:", err); // DEBUG
    res.status(500).json({ error: "Database error" });
  }

});

// ✅ Test Route
router.get("/test", (req, res) => {
  res.send("Reports route working");
});

module.exports = router;