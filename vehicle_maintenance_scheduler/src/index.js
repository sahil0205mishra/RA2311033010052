const express = require("express");
const cors = require("cors");
const path = require("path");

const { Log, requestLogger } = require(path.resolve(__dirname, "../../logging_middleware"));
const { fetchDepots, fetchVehicles } = require("./apiClient");
const { solveKnapsack } = require("./knapsack");

const app = express();
const PORT = 3001;

// ─── Middleware ───
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// ─── Cache for fetched data ───
let depotsCache = null;
let vehiclesCache = null;
let lastFetch = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches and caches depots and vehicles data.
 */
async function getData() {
  const now = Date.now();
  if (depotsCache && vehiclesCache && now - lastFetch < CACHE_TTL_MS) {
    return { depots: depotsCache, vehicles: vehiclesCache };
  }

  await Log("backend", "info", "controller", "Refreshing depots and vehicles cache");
  const [depots, vehicles] = await Promise.all([fetchDepots(), fetchVehicles()]);
  depotsCache = depots;
  vehiclesCache = vehicles;
  lastFetch = now;

  return { depots, vehicles };
}

/**
 * GET /schedule
 *
 * Returns the optimal vehicle scheduling for ALL depots.
 * For each depot, solves the 0/1 Knapsack to maximise total Impact
 * within the MechanicHours budget.
 */
app.get("/schedule", async (req, res) => {
  try {
    await Log("backend", "info", "handler", "GET /schedule request received");

    const { depots, vehicles } = await getData();

    await Log("backend", "info", "service", `Processing ${depots.length} depots`);

    const results = depots.map((depot) => {
      const { selectedItems, totalImpact, totalDuration } = solveKnapsack(
        vehicles,
        depot.MechanicHours
      );

      return {
        depotId: depot.ID,
        mechanicHoursAvailable: depot.MechanicHours,
        mechanicHoursUsed: totalDuration,
        totalImpactScore: totalImpact,
        numberOfTasksScheduled: selectedItems.length,
        scheduledTasks: selectedItems.map((item) => ({
          taskId: item.TaskID,
          duration: item.Duration,
          impact: item.Impact,
        })),
      };
    });

    const overallImpact = results.reduce((sum, r) => sum + r.totalImpactScore, 0);
    await Log("backend", "info", "handler", `Schedule done. Impact: ${overallImpact}`);

    res.json({
      success: true,
      totalDepots: results.length,
      schedules: results,
    });
  } catch (error) {
    await Log("backend", "error", "handler", `GET /schedule failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to compute vehicle schedule",
      message: error.message,
    });
  }
});

/**
 * GET /schedule/:depotId
 *
 * Returns the optimal vehicle scheduling for a SINGLE depot.
 */
app.get("/schedule/:depotId", async (req, res) => {
  try {
    const depotId = parseInt(req.params.depotId, 10);
    await Log("backend", "info", "handler", `GET /schedule/${depotId}`);

    const { depots, vehicles } = await getData();
    const depot = depots.find((d) => d.ID === depotId);

    if (!depot) {
      await Log("backend", "warn", "handler", `Depot ${depotId} not found`);
      return res.status(404).json({
        success: false,
        error: `Depot with ID ${depotId} not found`,
      });
    }

    const { selectedItems, totalImpact, totalDuration } = solveKnapsack(
      vehicles,
      depot.MechanicHours
    );

    await Log("backend", "info", "handler", `Depot ${depotId}: impact=${totalImpact}`);

    res.json({
      success: true,
      depotId: depot.ID,
      mechanicHoursAvailable: depot.MechanicHours,
      mechanicHoursUsed: totalDuration,
      totalImpactScore: totalImpact,
      numberOfTasksScheduled: selectedItems.length,
      scheduledTasks: selectedItems.map((item) => ({
        taskId: item.TaskID,
        duration: item.Duration,
        impact: item.Impact,
      })),
    });
  } catch (error) {
    await Log("backend", "error", "handler", `Depot schedule error`);
    res.status(500).json({
      success: false,
      error: "Failed to compute schedule for depot",
      message: error.message,
    });
  }
});

/**
 * GET /depots
 * Returns raw depot data from the evaluation server.
 */
app.get("/depots", async (req, res) => {
  try {
    await Log("backend", "info", "handler", "GET /depots request");
    const { depots } = await getData();
    res.json({ success: true, depots });
  } catch (error) {
    await Log("backend", "error", "handler", "Depots fetch error");
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /vehicles
 * Returns raw vehicle data from the evaluation server.
 */
app.get("/vehicles", async (req, res) => {
  try {
    await Log("backend", "info", "handler", "GET /vehicles request");
    const { vehicles } = await getData();
    res.json({ success: true, vehicles });
  } catch (error) {
    await Log("backend", "error", "handler", "Vehicles fetch error");
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /health
 * Health-check endpoint.
 */
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "vehicle-maintenance-scheduler" });
});

// ─── Start server ───
app.listen(PORT, async () => {
  await Log("backend", "info", "config", `Scheduler started on port ${PORT}`);
  console.log(`\n🚗 Vehicle Maintenance Scheduler running at http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /schedule          - Optimal schedule for all depots`);
  console.log(`  GET /schedule/:depotId - Optimal schedule for a single depot`);
  console.log(`  GET /depots            - Raw depot data`);
  console.log(`  GET /vehicles          - Raw vehicle data`);
  console.log(`  GET /health            - Health check\n`);
});

module.exports = app;
