const db = require("../config/db");

exports.createSale = async (req, res) => {
  try {
    const {
      items,
      invoiceNo,
      customer,
      total,
      discount,
      tax,
      finalTotal,
      paid,

      // ✅ ADD THESE
      isEMI,
      downPayment,
      months
    } = req.body;

    // ✅ 1. SAVE MAIN INVOICE
    const [invoiceResult] = await db.query(
      `INSERT INTO invoices 
      (invoice_no, customer, total, discount, tax, final_total, paid)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [invoiceNo, customer, total, discount, tax, finalTotal, paid]
    );

    const invoiceId = invoiceResult.insertId;

    // 🔁 LOOP ITEMS
    for (let item of items) {

      const [rows] = await db.query(
        "SELECT quantity, cost_price FROM products WHERE id = ?",
        [item.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      const stock = rows[0].quantity;
      const costPrice = Number(rows[0].cost_price || 0);

      if (item.qty > stock) {
        return res.status(400).json({
          message: `Not enough stock for ${item.name}`
        });
      }

      await db.query(
        "UPDATE products SET quantity = quantity - ? WHERE id = ?",
        [item.qty, item.id]
      );

      const lineTotal = item.qty * item.price;

      await db.query(
        "INSERT INTO sales (product_id, quantity, price, total) VALUES (?,?,?,?)",
        [item.id, item.qty, item.price, lineTotal]
      );

      const lineProfit = (item.price - costPrice) * item.qty;

      await db.query(
        `INSERT INTO invoice_items 
        (invoice_id, product_id, quantity, price, cost_price, line_total, line_profit)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          item.id,
          item.qty,
          item.price,
          costPrice,
          lineTotal,
          lineProfit
        ]
      );
    }

    // ✅ EMI LOGIC (FIXED)
    if (isEMI) {

      const balance = total - downPayment;
      const monthly = balance / months;

      await db.query(`
        INSERT INTO emi_plans 
        (invoice_id, customer, total_amount, down_payment, balance, monthly_amount, months)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId,
        customer,
        total,
        downPayment,
        balance,
        monthly,
        months
      ]);
    }

    res.json({ message: "Sale + Invoice + EMI saved successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};