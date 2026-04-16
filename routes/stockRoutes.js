const express = require("express");
const router = express.Router();

const stockController = require("../controllers/stockController");

router.post("/in", stockController.stockIn);
router.post("/out", stockController.stockOut);

module.exports = router;