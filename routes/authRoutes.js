const express = require("express");
const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  console.log("LOGIN HIT:", username, password);

  if (username === "admin" && password === "admin123") {
    return res.json({ token: "abc123" });
  }

  return res.status(401).json({ message: "Invalid credentials" });
});

module.exports = router;