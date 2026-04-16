const express = require("express");
const router = express.Router();
const { createSale } = require("../controllers/salesController");

// ✅ TEST ROUTE
router.get("/test", (req, res) => {
  res.send("Sales route working");
});

// ✅ MAIN ROUTE
router.post("/", createSale);

module.exports = router;