const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ================= GET SERVICES WITH WORKERS =================
exports.getServices = async (req, res) => {
  try {
    console.log("🔥 getServices API HIT");

    const [services] = await db.query("SELECT * FROM services");

    for (let service of services) {
      console.log("👉 Service:", service.id);

      const [workers] = await db.query(`
        SELECT 
          w.id,
          w.name,
          w.phone,
          w.service_id,
          w.status,
          w.photo,
          w.latitude,
          w.longitude,
          w.lat,
          w.lng,

          (SELECT COUNT(*) FROM bookings b WHERE b.worker_id = w.id) AS total_jobs,
          (SELECT COUNT(*) FROM bookings b WHERE b.worker_id = w.id AND b.status = 'completed') AS completed_jobs,
          (SELECT COUNT(*) FROM bookings b WHERE b.worker_id = w.id AND b.status = 'active') AS active_jobs,
          (SELECT COUNT(*) FROM bookings b WHERE b.worker_id = w.id AND b.status = 'pending') AS pending_jobs

        FROM workers w
        WHERE w.service_id = ?
      `, [service.id]);

      service.workers = workers;
    }

    res.json(services);
  } catch (err) {
    console.log("GET SERVICES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};



// ================= REGISTER WORKER =================
exports.registerWorker = async (req, res) => {
  try {

    console.log("REGISTER BODY:", req.body);
    // ✅ UPDATED (added email + password)

    const { name, phone, service_id, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

      await db.query(
        `INSERT INTO workers (name, phone, service_id, email, password, status)
        VALUES (?, ?, ?, ?, ?, 'pending')`,
        [name, phone, service_id, email, hashedPassword]
      );

    res.json({ message: "Worker registered. Waiting for approval." });

  } catch (err) {
    console.log("REGISTER WORKER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ================= WORKER LOGIN =================
exports.workerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM workers WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const worker = rows[0];

    const isMatch = await bcrypt.compare(password, worker.password);

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }

    // // 🔥 STATUS CHECK BEFORE LOGIN
    //   if (worker.status === "pending") {
    //     return res.status(403).json({
    //       message: "⏳ Waiting for admin approval"
    //     });
    //   }

    //   if (worker.status === "inactive") {
    //     return res.status(403).json({
    //       message: "❌ Account rejected. Contact admin"
    //     });
    //   }

      const token = jwt.sign(
          { id: worker.id },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        // don't send password to frontend
        delete worker.password;

        res.json({
          token,
          worker
        });

  } catch (err) {
    console.log("WORKER LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


// ================= GET WORKER JOBS =================
exports.getWorkerJobs = async (req, res) => {
  try {
    const { worker_id } = req.params;

    const [rows] = await db.query(`
      SELECT 
        b.id,
        b.customer_name,
        b.status,
        s.name AS service_name
      FROM bookings b
      LEFT JOIN services s ON b.service_id = s.id
      WHERE b.worker_id = ?
    `, [worker_id]);

    res.json(rows);

  } catch (err) {
    console.log("GET WORKER JOBS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ================= CREATE BOOKING (MANUAL + AUTO) =================
exports.createBooking = async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      service_id,
      worker_id, // optional
      date,
      time,
      address,
      customer_lat,
      customer_lng
    } = req.body;

    let finalWorkerId;

    // =====================================================
    // 🔹 CASE 1: MANUAL ASSIGN (ADMIN SELECTED WORKER)
    // =====================================================
    if (worker_id) {
      const [worker] = await db.query(
        "SELECT status, service_id FROM workers WHERE id = ?",
        [worker_id]
      );

      if (!worker.length) {
        return res.status(404).json({ error: "Worker not found" });
      }

      if (worker[0].status !== "active") {
        return res.status(400).json({
          error: "Worker not approved"
        });
      }

      if (worker[0].service_id !== Number(service_id)) {
        return res.status(400).json({
          error: "Worker does not belong to this service"
        });
      }

      finalWorkerId = worker_id;
    }

    // =====================================================
    // 🔹 CASE 2: AUTO ASSIGN (NO WORKER SELECTED)
    // =====================================================
    else {
      const [workers] = await db.query(`
        SELECT 
          w.id,
          w.latitude,
          w.longitude,
          COUNT(b.id) AS total_jobs
        FROM workers w
        LEFT JOIN bookings b
          ON w.id = b.worker_id
          AND b.status IN ('pending', 'active')
        WHERE w.service_id = ?
          AND w.status = 'active'
        GROUP BY w.id
        ORDER BY total_jobs ASC
      `, [service_id]);

      if (!workers.length) {
        return res.status(400).json({
          error: "No active worker available"
        });
      }

      // 🔥 Distance logic
      const getDistance = (lat1, lng1, lat2, lng2) => {
        if (!lat2 || !lng2) return 9999;

        const toRad = v => (v * Math.PI) / 180;
        const R = 6371;

        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLng / 2) ** 2;

        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      };

      let selectedWorker = workers[0];

      if (customer_lat && customer_lng) {
        let shortest = getDistance(
          customer_lat,
          customer_lng,
          workers[0].latitude,
          workers[0].longitude
        );

        for (const w of workers) {
          const dist = getDistance(
            customer_lat,
            customer_lng,
            w.latitude,
            w.longitude
          );

          if (dist < shortest) {
            shortest = dist;
            selectedWorker = w;
          }
        }
      }

      finalWorkerId = selectedWorker.id;
    }

    // =====================================================
    // 🔹 INSERT BOOKING
    // =====================================================
    await db.query(
      `INSERT INTO bookings
      (customer_name, customer_phone, service_id, worker_id, date, time, address, customer_lat, customer_lng, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        customer_name,
        customer_phone,
        service_id,
        finalWorkerId,
        date,
        time,
        address,
        customer_lat || null,
        customer_lng || null
      ]
    );

    res.json({
      message: "Booking created",
      worker_id: finalWorkerId
    });

  } catch (err) {
    console.log("CREATE BOOKING ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ================= APPROVE / REJECT =================
exports.updateWorkerStatus = async (req, res) => {
  try {
    const { id, status } = req.body;

    await db.query(
      "UPDATE workers SET status = ? WHERE id = ?",
      [status, id]
    );

    res.json({ message: "Worker status updated" });
  } catch (err) {
    console.log("UPDATE WORKER STATUS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ================= GET BOOKINGS =================
exports.getBookings = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        b.*,
        w.name AS worker_name,
        w.latitude AS worker_lat,
        w.longitude AS worker_lng,
        s.name AS service_name
      FROM bookings b
      LEFT JOIN workers w ON b.worker_id = w.id
      LEFT JOIN services s ON b.service_id = s.id
    `);

    res.json(rows);
  } catch (err) {
    console.log("GET BOOKINGS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ================= UPDATE BOOKING STATUS =================
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id, status } = req.body;

    await db.query(
      "UPDATE bookings SET status = ? WHERE id = ?",
      [status, id]
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.log("UPDATE STATUS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ================= WORKER PERFORMANCE =================
exports.getWorkerPerformance = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        w.id,
        w.name,
        w.phone,
        w.status,
        w.photo,
        w.service_id,
        w.latitude,
        w.longitude,
        s.name AS service_name,
        COUNT(b.id) AS total_jobs,
        SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) AS pending_jobs,
        SUM(CASE WHEN b.status = 'active' THEN 1 ELSE 0 END) AS active_jobs,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS completed_jobs
      FROM workers w
      LEFT JOIN services s ON w.service_id = s.id
      LEFT JOIN bookings b ON w.id = b.worker_id
      GROUP BY
        w.id, w.name, w.phone, w.status, w.photo,
        w.service_id, w.latitude, w.longitude, s.name
      ORDER BY total_jobs DESC
    `);

    res.json(rows);
  } catch (err) {
    console.log("GET WORKER PERFORMANCE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ================= UPDATE WORKER LOCATION =================
exports.updateWorkerLocation = async (req, res) => {
  try {
    const { worker_id, latitude, longitude } = req.body;

    await db.query(
      "UPDATE workers SET latitude = ?, longitude = ? WHERE id = ?",
      [latitude, longitude, worker_id]
    );

    res.json({ message: "Worker location updated" });
  } catch (err) {
    console.log("UPDATE WORKER LOCATION ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};