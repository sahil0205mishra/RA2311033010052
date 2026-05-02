const axios = require("axios");
const path = require("path");
const CONFIG = require(path.resolve(__dirname, "../../logging_middleware/config"));
const { Log, getAuthToken } = require(path.resolve(__dirname, "../../logging_middleware"));

/**
 * Fetches all notifications from the evaluation server.
 *
 * @returns {Promise<Array<{ID: string, Type: string, Message: string, Timestamp: string}>>}
 */
async function fetchNotifications() {
  try {
    const token = await getAuthToken();
    await Log("backend", "info", "service", "Fetching notifications from server");

    const response = await axios.get(
      `${CONFIG.BASE_URL}/evaluation-service/notifications`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const notifications = response.data.notifications || [];
    await Log("backend", "info", "service", `Fetched ${notifications.length} notifications`);
    return notifications;
  } catch (error) {
    await Log("backend", "error", "service", `Notification fetch failed`);
    throw error;
  }
}

module.exports = { fetchNotifications };
