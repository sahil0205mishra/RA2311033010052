const axios = require("axios");
const CONFIG = require("./config");

// ─── Valid values for each field (lowercase only) ───
const VALID_STACKS = ["backend", "frontend"];
const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"];
const VALID_BACKEND_PACKAGES = [
  "cache", "controller", "cron_job", "db", "domain",
  "handler", "repository", "route", "service",
];
const VALID_SHARED_PACKAGES = ["auth", "config", "middleware", "utils"];
const VALID_PACKAGES = [...VALID_BACKEND_PACKAGES, ...VALID_SHARED_PACKAGES];

// ─── Token cache ───
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Obtain a Bearer token from the evaluation server.
 * Caches the token until it expires.
 */
async function getAuthToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExpiresAt - 30) {
    return cachedToken;
  }

  try {
    const response = await axios.post(
      `${CONFIG.BASE_URL}/evaluation-service/auth`,
      {
        email: CONFIG.EMAIL,
        name: CONFIG.NAME,
        rollNo: CONFIG.ROLL_NO,
        accessCode: CONFIG.ACCESS_CODE,
        clientID: CONFIG.CLIENT_ID,
        clientSecret: CONFIG.CLIENT_SECRET,
      }
    );

    cachedToken = response.data.access_token;
    tokenExpiresAt = response.data.expires_in || now + 3600;
    return cachedToken;
  } catch (error) {
    console.error(
      "[LogMiddleware] Auth failed:",
      error.response?.data || error.message
    );
    throw new Error("Failed to obtain auth token for logging");
  }
}

/**
 * Reusable Log function that sends structured logs to the evaluation server.
 *
 * @param {string} stack   - "backend" or "frontend"
 * @param {string} level   - "debug" | "info" | "warn" | "error" | "fatal"
 * @param {string} pkg     - Package name (e.g., "handler", "db", "service")
 * @param {string} message - Descriptive log message
 * @returns {Promise<object|null>} - Server response or null on failure
 */
async function Log(stack, level, pkg, message) {
  // ─── Validate inputs ───
  const s = String(stack).toLowerCase();
  const l = String(level).toLowerCase();
  const p = String(pkg).toLowerCase();
  const m = String(message).substring(0, 48);

  if (!VALID_STACKS.includes(s)) {
    console.error(`[LogMiddleware] Invalid stack: "${stack}". Must be one of: ${VALID_STACKS.join(", ")}`);
    return null;
  }
  if (!VALID_LEVELS.includes(l)) {
    console.error(`[LogMiddleware] Invalid level: "${level}". Must be one of: ${VALID_LEVELS.join(", ")}`);
    return null;
  }
  if (!VALID_PACKAGES.includes(p)) {
    console.error(`[LogMiddleware] Invalid package: "${pkg}". Must be one of: ${VALID_PACKAGES.join(", ")}`);
    return null;
  }

  try {
    const token = await getAuthToken();

    const response = await axios.post(
      `${CONFIG.BASE_URL}/evaluation-service/logs`,
      {
        stack: s,
        level: l,
        package: p,
        message: m,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "[LogMiddleware] Failed to send log:",
      error.response?.data || error.message
    );
    return null;
  }
}

/**
 * Express-compatible middleware that logs every incoming request.
 * Attach with: app.use(requestLogger)
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const msg = `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    Log("backend", level, "middleware", msg);
  });

  next();
}

module.exports = { Log, getAuthToken, requestLogger };
