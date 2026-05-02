const express = require("express");
const cors = require("cors");
const path = require("path");

const { Log, requestLogger } = require(path.resolve(__dirname, "../../logging_middleware"));
const { fetchNotifications } = require("./apiClient");
const { getTopNPriorityNotifications, TYPE_WEIGHTS } = require("./priorityInbox");

const app = express();
const PORT = 3002;

// ─── Middleware ───
app.use(cors());
app.use(express.json());
app.use(requestLogger);

/**
 * GET /notifications/priority
 *
 * Returns the top-N priority notifications.
 * Priority is determined by type weight (Placement > Result > Event) and recency.
 *
 * Query Parameters:
 *   - n (optional): Number of top notifications to return (default: 10)
 */
app.get("/notifications/priority", async (req, res) => {
  try {
    const n = parseInt(req.query.n, 10) || 10;
    await Log("backend", "info", "handler", `GET /priority?n=${n}`);

    // Fetch all notifications from the evaluation server
    const notifications = await fetchNotifications();
    await Log("backend", "info", "service", `Processing ${notifications.length} notifs`);

    // Compute priority and get top N
    const topN = getTopNPriorityNotifications(notifications, n);

    await Log("backend", "info", "handler", `Priority inbox: top ${topN.length}`);

    res.json({
      success: true,
      count: topN.length,
      requestedN: n,
      totalNotifications: notifications.length,
      priorityWeights: TYPE_WEIGHTS,
      priorityNotifications: topN,
    });
  } catch (error) {
    await Log("backend", "error", "handler", "Priority inbox error");
    res.status(500).json({
      success: false,
      error: "Failed to compute priority inbox",
      message: error.message,
    });
  }
});

/**
 * GET /notifications
 *
 * Returns all notifications from the evaluation server (raw data).
 */
app.get("/notifications", async (req, res) => {
  try {
    await Log("backend", "info", "handler", "GET /notifications request");

    const notifications = await fetchNotifications();

    await Log("backend", "info", "handler", `Returning ${notifications.length} notifs`);

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    await Log("backend", "error", "handler", "Notification fetch error");
    res.status(500).json({
      success: false,
      error: "Failed to fetch notifications",
      message: error.message,
    });
  }
});

/**
 * GET /notifications/stats
 *
 * Returns notification statistics grouped by type.
 */
app.get("/notifications/stats", async (req, res) => {
  try {
    await Log("backend", "info", "handler", "GET /notifications/stats request");

    const notifications = await fetchNotifications();

    // Group by type
    const stats = {};
    for (const notif of notifications) {
      if (!stats[notif.Type]) {
        stats[notif.Type] = { count: 0, weight: TYPE_WEIGHTS[notif.Type] || 0 };
      }
      stats[notif.Type].count++;
    }

    await Log("backend", "info", "handler", "Notification stats computed");

    res.json({
      success: true,
      totalNotifications: notifications.length,
      byType: stats,
    });
  } catch (error) {
    await Log("backend", "error", "handler", "Stats fetch error");
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /health
 * Health-check endpoint.
 */
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "notification-app-be" });
});

// ─── Start server ───
app.listen(PORT, async () => {
  await Log("backend", "info", "config", `Notif app started on port ${PORT}`);
  console.log(`\n🔔 Notification App Backend running at http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /notifications/priority?n=10 - Top-N priority notifications`);
  console.log(`  GET /notifications               - All notifications (raw)`);
  console.log(`  GET /notifications/stats          - Notification statistics`);
  console.log(`  GET /health                       - Health check\n`);
});

module.exports = app;
