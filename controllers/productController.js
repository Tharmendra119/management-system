const db = require("../config/db");

exports.getProducts = async (req, res) => {
  try {
    const [result] = await db.query("SELECT * FROM products");
    res.json(result);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.addProduct = async (req, res) => {
  try {
    const { name, price, quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const sql =
      "INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)";

    const [result] = await db.query(sql, [name, price, quantity]);

    /* HISTORY */
    await db.query(
      `INSERT INTO product_history
      (product_id, product_name, action_type, previous_value, new_value)
      VALUES (?,?,?,?,?)`,
      [
        result.insertId,
        name,
        "ADD_PRODUCT",
        "New Product",
        `Name:${name}, Price:${price}, Qty:${quantity}`
      ]
    );

    res.json({ message: "Product added" });

  } catch (err) {
    res.status(500).json(err);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, price, quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const [rows] = await db.query(
      "SELECT * FROM products WHERE id=?",
      [id]
    );

    const product = rows[0];

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const sql =
      "UPDATE products SET name=?, price=?, quantity=? WHERE id=?";

    await db.query(sql, [name, price, quantity, id]);

    /* HISTORY */
    await db.query(
      `INSERT INTO product_history
      (product_id, product_name, action_type, previous_value, new_value)
      VALUES (?,?,?,?,?)`,
      [
        product.id,
        product.name,
        "UPDATE_PRODUCT",
        `Name:${product.name}, Price:${product.price}, Qty:${product.quantity}`,
        `Name:${name}, Price:${price}, Qty:${quantity}`
      ]
    );

    res.json({ message: "Product updated" });

  } catch (err) {
    res.status(500).json(err);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const id = req.params.id;

    const [rows] = await db.query(
      "SELECT * FROM products WHERE id=?",
      [id]
    );

    const product = rows[0];

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await db.query("DELETE FROM products WHERE id=?", [id]);

    /* HISTORY */
    await db.query(
      `INSERT INTO product_history
      (product_id, product_name, action_type, previous_value, new_value)
      VALUES (?,?,?,?,?)`,
      [
        product.id,
        product.name,
        "DELETE_PRODUCT",
        `Name:${product.name}, Price:${product.price}, Qty:${product.quantity}`,
        "Deleted"
      ]
    );

    res.json({ message: "Product deleted" });

  } catch (err) {
    res.status(500).json(err);
  }
};