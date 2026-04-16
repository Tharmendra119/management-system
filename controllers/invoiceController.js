const db = require("../config/db");

exports.getSalesSummary = async (req, res) => {
  try {
    const [[salesRow]] = await db.query(
      "SELECT COALESCE(SUM(final_total), 0) AS totalSales FROM invoices"
    );

    const [[profitRow]] = await db.query(
      "SELECT COALESCE(SUM(line_profit), 0) AS totalProfit FROM invoice_items"
    );

    const [[expenseRow]] = await db.query(
      "SELECT COALESCE(SUM(amount), 0) AS totalExpenses FROM expenses"
    );

    res.json({
      totalSales: Number(salesRow.totalSales || 0),
      totalProfit: Number(profitRow.totalProfit || 0),
      totalExpenses: Number(expenseRow.totalExpenses || 0),
      netProfit: Number(profitRow.totalProfit || 0) - Number(expenseRow.totalExpenses || 0)
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, invoice_no, customer, total, discount, tax, final_total, paid, created_at
       FROM invoices
       ORDER BY created_at DESC`
    );

    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const [invoiceRows] = await db.query(
      `SELECT id, invoice_no, customer, total, discount, tax, final_total, paid, created_at
       FROM invoices
       WHERE id = ?`,
      [id]
    );

    if (invoiceRows.length === 0) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const [itemRows] = await db.query(
      `SELECT ii.id, ii.product_id, p.name AS product_name, ii.quantity, ii.price, ii.cost_price, ii.line_total, ii.line_profit
       FROM invoice_items ii
       LEFT JOIN products p ON p.id = ii.product_id
       WHERE ii.invoice_id = ?`,
      [id]
    );

    res.json({
      invoice: invoiceRows[0],
      items: itemRows
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};