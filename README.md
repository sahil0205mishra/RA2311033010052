# Campus Hiring Evaluation - Backend

## Project Structure

```
├── logging_middleware/                 # Reusable logging package
│   ├── config.js                      # Server credentials & configuration
│   ├── index.js                       # Log() function & Express middleware
│   └── package.json
│
├── vehicle_maintenance_scheduler/     # Task 1: Vehicle scheduling (0/1 Knapsack)
│   ├── src/
│   │   ├── index.js                   # Express server (port 3001)
│   │   ├── knapsack.js                # DP-based 0/1 Knapsack solver
│   │   └── apiClient.js               # Fetches depots & vehicles from API
│   └── package.json
│
├── notification_app_be/               # Task 2 - Stage 6: Priority Inbox
│   ├── src/
│   │   ├── index.js                   # Express server (port 3002)
│   │   ├── priorityInbox.js           # Priority scoring algorithm + min-heap
│   │   └── apiClient.js               # Fetches notifications from API
│   └── package.json
│
├── notification_system_design.md      # Task 2 - Stages 1-6: System design document
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/sahil0205mishra/RA2311033010052.git
cd RA2311033010052
```

### 2. Install dependencies

```bash
# Logging middleware
cd logging_middleware
npm install

# Vehicle Maintenance Scheduler
cd ../vehicle_maintenance_scheduler
npm install

# Notification App Backend
cd ../notification_app_be
npm install
```

### 3. Configure credentials

Update `logging_middleware/config.js` with your evaluation server credentials:

```js
const CONFIG = {
  BASE_URL: "http://20.207.122.201",
  EMAIL: "your-email",
  NAME: "your-name",
  ROLL_NO: "your-roll-no",
  ACCESS_CODE: "your-access-code",
  CLIENT_ID: "your-client-id",
  CLIENT_SECRET: "your-client-secret",
};
```

---

## Running the Applications

### Vehicle Maintenance Scheduler

```bash
cd vehicle_maintenance_scheduler
npm start
```

Server starts on **http://localhost:3001**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/schedule` | GET | Optimal schedule for all depots |
| `/schedule/:depotId` | GET | Optimal schedule for a single depot |
| `/depots` | GET | Raw depot data from evaluation server |
| `/vehicles` | GET | Raw vehicle data from evaluation server |
| `/health` | GET | Health check |

### Notification App Backend (Priority Inbox)

```bash
cd notification_app_be
npm start
```

Server starts on **http://localhost:3002**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notifications/priority?n=10` | GET | Top-N priority notifications |
| `/notifications` | GET | All notifications (raw) |
| `/notifications/stats` | GET | Notification statistics by type |
| `/health` | GET | Health check |

---

## Technical Details

### Logging Middleware

A reusable `Log(stack, level, package, message)` function that sends structured logs to the evaluation server via POST request. Integrated throughout the application using the allowed values:

- **Stack:** `backend`
- **Level:** `debug`, `info`, `warn`, `error`, `fatal`
- **Package:** `cache`, `controller`, `cron_job`, `db`, `domain`, `handler`, `repository`, `route`, `service`, `auth`, `config`, `middleware`, `utils`

### Vehicle Maintenance Scheduler (0/1 Knapsack)

- Fetches depots (each with a MechanicHours budget) and vehicles (each with Duration and Impact)
- Solves the **0/1 Knapsack** problem using bottom-up Dynamic Programming
- **Time Complexity:** O(n × W) where n = number of vehicles, W = mechanic-hours capacity
- **No external algorithm libraries** used

### Notification System Design (Stages 1-6)

Documented in `notification_system_design.md`:

| Stage | Topic |
|-------|-------|
| 1 | REST API design with SSE real-time notifications |
| 2 | PostgreSQL database schema with indexes |
| 3 | Query optimization & indexing strategy |
| 4 | Redis caching strategy (Cache-Aside + TTL) |
| 5 | Reliable bulk notifications with message queues |
| 6 | Priority Inbox algorithm with min-heap |

### Priority Inbox (Stage 6 Implementation)

Ranks notifications using a combined score:

```
priorityScore = (typeWeight × 100) + recencyScore
```

- **Type weights:** Placement (3) > Result (2) > Event (1)
- **Recency:** Normalized 0-1 score based on timestamp

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **HTTP Client:** Axios
- **Algorithm:** Custom DP-based 0/1 Knapsack (no external libraries)
