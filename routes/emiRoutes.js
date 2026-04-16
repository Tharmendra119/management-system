const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ✅ GET ALL EMI
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM emi_plans");
    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ PAY EMI
router.post("/pay", async (req, res) => {
  try {
    const { emi_id, amount } = req.body;

    await db.query(
      "INSERT INTO emi_payments (emi_id, amount) VALUES (?, ?)",
      [emi_id, amount]
    );

    await db.query(
      "UPDATE emi_plans SET balance = balance - ? WHERE id = ?",
      [amount, emi_id]
    );

    res.json({ message: "EMI paid" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;