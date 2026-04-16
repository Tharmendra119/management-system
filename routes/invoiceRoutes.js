const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/invoiceController");

router.get("/summary", invoiceController.getSalesSummary);
router.get("/", invoiceController.getInvoices);
router.get("/:id", invoiceController.getInvoiceById);

module.exports = router;