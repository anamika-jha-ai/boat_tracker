/// server.js
import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

import Route from "./models/route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ====== DB CONNECTION ======
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/boat_tracker";

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    // Seed routes if empty
    const count = await Route.countDocuments();
    if (count === 0) {
      console.log("Seeding initial routes...");
      await Route.insertMany([
        {
          name: "Rishra → Khardaha",
          fromCity: "Rishra",
          toCity: "Khardaha",
          code: "rishra-khardaha",
          firstDepartureMinutes: 5 * 60, // 5:00
          lastDepartureMinutes: 22 * 60 + 20, // 22:20
          intervalMinutes: 20, // every 20 mins
        },
        {
          name: "Konnagar → Sodepur",
          fromCity: "Konnagar",
          toCity: "Sodepur",
          code: "konnagar-sodepur",
          firstDepartureMinutes: 5 * 60,
          lastDepartureMinutes: 22 * 60 + 20,
          intervalMinutes: 10, // every 10 mins
        },
      ]);

      console.log("Routes seeded ✅");
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

// ====== HELPERS ======
const TIDE_START_MINUTES = 12 * 60; // 12:00
const TIDE_END_MINUTES = 12 * 60 + 45; // 12:45

function getMinutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatTimeLabel(totalMinutes) {
  let h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  if (h > 12) h -= 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

function buildSchedule(route) {
  const now = new Date();
  const nowMinutes = getMinutesOfDay(now);

  const allDepartures = [];
  let status = "running";
  let message = "";

  if (nowMinutes < route.firstDepartureMinutes) {
    status = "before_start";
    message = "Services haven’t started yet. First boat at 5:00 AM.";
  } else if (nowMinutes > route.lastDepartureMinutes) {
    status = "closed";
    message = "No more boats today. Next service starts at 5:00 AM tomorrow.";
  } else if (nowMinutes >= TIDE_START_MINUTES && nowMinutes < TIDE_END_MINUTES) {
    status = "tide_break";
    message =
      "Services paused due to high tide (approx. 12:00–12:45 PM). Please wait for the next slot.";
  }

  // Generate departures for the whole day
  for (
    let t = route.firstDepartureMinutes;
    t <= route.lastDepartureMinutes;
    t += route.intervalMinutes
  ) {
    const isInTideWindow = t >= TIDE_START_MINUTES && t < TIDE_END_MINUTES;

    let depStatus = "upcoming";

    if (isInTideWindow) {
      depStatus = "tide_block";
    } else if (t < nowMinutes) {
      depStatus = "departed";
    } else if (t >= nowMinutes && !allDepartures.some((d) => d.status === "next")) {
      depStatus = "next";
    } else if (t > nowMinutes) {
      depStatus = "upcoming";
    }

    allDepartures.push({
      minutesOfDay: t,
      timeLabel: formatTimeLabel(t),
      status: depStatus,
    });
  }

  const next = allDepartures.find((d) => d.status === "next") || null;
  const upcoming = allDepartures
    .filter((d) => d.status === "upcoming")
    .slice(0, 5);

  return {
    routeId: route._id,
    routeName: route.name,
    fromCity: route.fromCity,
    toCity: route.toCity,
    currentTime: formatTimeLabel(nowMinutes),
    serviceStatus: status,
    message,
    nextDeparture: next,
    upcoming,
    allDepartures,
  };
}

// ====== API ROUTES ======

// All routes for dropdown
app.get("/api/routes", async (req, res) => {
  try {
    const routes = await Route.find().sort({ fromCity: 1 });
    res.json(
      routes.map((r) => ({
        id: r._id,
        name: r.name,
        fromCity: r.fromCity,
        toCity: r.toCity,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch routes" });
  }
});

// Full schedule + next boat for a route
// defensive / tolerant schedule endpoint
app.get("/api/schedule/:id", async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    // LOG the route so you can inspect it in server console
    console.log("ROUTE RECEIVED FROM DB:", JSON.stringify(route, null, 2));

    // REQUIRED numeric fields that buildSchedule expects
    const required = ["firstDepartureMinutes", "lastDepartureMinutes", "intervalMinutes"];

    // If fields missing, fill with safe defaults (so frontend will show something)
    const defaults = {
      firstDepartureMinutes: typeof route.firstDepartureMinutes === "number" ? route.firstDepartureMinutes : 5 * 60, // 05:00 => 300
      lastDepartureMinutes: typeof route.lastDepartureMinutes === "number" ? route.lastDepartureMinutes : 20 * 60, // 20:00 => 1200
      intervalMinutes: typeof route.intervalMinutes === "number" ? route.intervalMinutes : 20 // default every 20 minutes
    };

    // If any required field is missing, warn and set default
    const missing = required.filter(k => typeof route[k] !== "number");
    if (missing.length) {
      console.warn("Route has missing fields:", missing, "— applying defaults for runtime. Consider updating DB.");
      // copy defaults into route object used by buildSchedule (do not mutate DB)
      missing.forEach(k => { route[k] = defaults[k]; });
    }

    // now build schedule (route has safe numeric values)
    const schedule = buildSchedule(route);
    res.json(schedule);
  } catch (err) {
    console.error("schedule route error:", err && err.stack ? err.stack : err);
    res.status(500).json({ error: "Failed to build schedule" });
  }
});


// Fallback: serve index.html
// Serve frontend for all other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


app.listen(PORT, () => {
  console.log(`🚤 Server running at http://localhost:${PORT}`);
});















