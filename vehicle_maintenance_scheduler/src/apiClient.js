const axios = require("axios");
const path = require("path");
const CONFIG = require(path.resolve(__dirname, "../../logging_middleware/config"));
const { Log, getAuthToken } = require(path.resolve(__dirname, "../../logging_middleware"));

/**
 * Fetches the list of depots from the evaluation server.
 * Each depot has an ID and MechanicHours budget.
 *
 * @returns {Promise<Array<{ID: number, MechanicHours: number}>>}
 */
async function fetchDepots() {
  try {
    const token = await getAuthToken();
    await Log("backend", "info", "service", "Fetching depots from server");

    const response = await axios.get(
      `${CONFIG.BASE_URL}/evaluation-service/depots`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const depots = response.data.depots || [];
    await Log("backend", "info", "service", `Fetched ${depots.length} depots`);
    return depots;
  } catch (error) {
    await Log("backend", "error", "service", `Depot fetch failed: ${error.message}`);
    throw error;
  }
}

/**
 * Fetches the list of vehicles (tasks) from the evaluation server.
 * Each vehicle has TaskID, Duration (hours), and Impact (score).
 *
 * @returns {Promise<Array<{TaskID: string, Duration: number, Impact: number}>>}
 */
async function fetchVehicles() {
  try {
    const token = await getAuthToken();
    await Log("backend", "info", "service", "Fetching vehicles from server");

    const response = await axios.get(
      `${CONFIG.BASE_URL}/evaluation-service/vehicles`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const vehicles = response.data.vehicles || [];
    await Log("backend", "info", "service", `Fetched ${vehicles.length} vehicles`);
    return vehicles;
  } catch (error) {
    await Log("backend", "error", "service", `Vehicle fetch failed: ${error.message}`);
    throw error;
  }
}

module.exports = { fetchDepots, fetchVehicles };
