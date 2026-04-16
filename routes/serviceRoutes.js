const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth");

const {
  getServices,
  createBooking,
  getBookings,
  updateBookingStatus,
  getWorkerPerformance,
  updateWorkerLocation,
  registerWorker,
  updateWorkerStatus,
  workerLogin,
  getWorkerJobs
} = require("../controllers/serviceController");

// ================= PUBLIC ROUTES =================

// SERVICES (public view)
router.get("/", getServices);

// REGISTER WORKER
router.post("/register-worker", registerWorker);

// WORKER LOGIN
router.post("/worker-login", workerLogin);

// ================= PROTECTED ROUTES =================

// CREATE BOOKING (admin)
router.post("/book", verifyToken, createBooking);

// GET BOOKINGS (admin)
router.get("/bookings", verifyToken, getBookings);

// UPDATE BOOKING STATUS (worker/admin)
router.put("/status", verifyToken, updateBookingStatus);

// WORKER JOBS (worker)
router.get("/worker-jobs/:worker_id", verifyToken, getWorkerJobs);

// WORKER APPROVAL (admin)
router.post("/worker-status", verifyToken, updateWorkerStatus);

// WORKER PERFORMANCE (admin)
router.get("/worker-performance", verifyToken, getWorkerPerformance);

// WORKER LOCATION UPDATE (worker live tracking)
router.put("/workers/location", verifyToken, updateWorkerLocation);

console.log("BOOKINGS ROUTE LOADED");

module.exports = router;