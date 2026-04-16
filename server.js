require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");

const db = require("./config/db");

// ROUTES
const invoiceRoutes = require("./routes/invoiceRoutes");
const productRoutes = require("./routes/productRoutes");
const stockRoutes = require("./routes/stockRoutes");
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const historyRoutes = require("./routes/historyRoutes");
const salesRoutes = require("./routes/sales");
const serviceRoutes = require("./routes/serviceRoutes");
const emiRoutes = require("./routes/emiRoutes");

const app = express();

// ================= SECURITY MIDDLEWARE =================

// 🔐 Helmet
app.use(helmet());

// 🔐 CORS (restrict frontend)
app.use(cors({
  origin: ["http://localhost:3000"], // change after deploy
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 🔐 Body parser
app.use(express.json());

// 🔐 Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// ================= ROUTES =================

app.use("/api/products", productRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/emi", emiRoutes);

// ================= TEST ROUTES =================

app.get("/api/test", (req, res) => {
  res.send("Server working");
});

app.get("/", (req, res) => {
  res.send("Stock Management API Running");
});

// ================= SERVER + SOCKET =================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"], // same as frontend
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// ✅ VERY IMPORTANT (for controllers)
app.set("io", io);

// ================= SOCKET LOGIC =================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("updateLocation", async (data) => {
    try {
      const { worker_id, latitude, longitude } = data;

      await db.query(
        "UPDATE workers SET latitude = ?, longitude = ? WHERE id = ?",
        [latitude, longitude, worker_id]
      );

      io.emit("workerMoved", {
        worker_id,
        latitude,
        longitude
      });

    } catch (err) {
      console.log("SOCKET LOCATION ERROR:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// ================= START SERVER =================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});