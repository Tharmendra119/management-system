const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// 🔐 Load from environment variables
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  console.log("LOGIN HIT:", username);

  // ✅ Compare with env values (NOT hardcoded)
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ token: "abc123" });
  }

  return res.status(401).json({ message: "Invalid credentials" });
});

module.exports = router;