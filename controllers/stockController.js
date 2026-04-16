const db = require("../config/db");

exports.stockIn = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const [rows] = await db.query(
      "SELECT * FROM products WHERE id = ?",
      [product_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = rows[0];

    const oldQuantity = product.quantity;
    const newQuantity = oldQuantity + Number(quantity);

    await db.query(
      "UPDATE products SET quantity = quantity + ? WHERE id = ?",
      [quantity, product_id]
    );

    /* HISTORY */
    await db.query(
      `INSERT INTO product_history
      (product_id, product_name, action_type, previous_value, new_value)
      VALUES (?,?,?,?,?)`,
      [
        product.id,
        product.name,
        "STOCK_IN",
        oldQuantity,
        newQuantity
      ]
    );

    res.json({ message: "Stock added successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Database error" });
  }
};

exports.stockOut = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const [rows] = await db.query(
      "SELECT * FROM products WHERE id = ?",
      [product_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = rows[0];

    const oldQuantity = product.quantity;
    const newQuantity = oldQuantity - Number(quantity);

    await db.query(
      "UPDATE products SET quantity = quantity - ? WHERE id = ?",
      [quantity, product_id]
    );

    /* HISTORY */
    await db.query(
      `INSERT INTO product_history
      (product_id, product_name, action_type, previous_value, new_value)
      VALUES (?,?,?,?,?)`,
      [
        product.id,
        product.name,
        "STOCK_OUT",
        oldQuantity,
        newQuantity
      ]
    );

    /* SALES (FIXED POSITION) */
    await db.query(
      "INSERT INTO sales (product_id, quantity, price, total) VALUES (?,?,?,?)",
      [
        product.id,
        quantity,
        product.price,
        quantity * product.price
      ]
    );

    res.json({ message: "Stock removed successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Database error" });
  }
};