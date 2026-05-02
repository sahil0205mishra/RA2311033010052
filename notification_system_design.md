# Campus Notifications Microservice - System Design

---

## Stage 1: REST API Design

### Overview

This document presents the REST API design for a **Campus Notification Platform** where students receive real-time updates regarding **Placements**, **Events**, and **Results**. The system supports creating, retrieving, and managing notifications with real-time delivery capabilities.

### Core Actions

| Action | Description |
|--------|-------------|
| Fetch all notifications for a student | Retrieve paginated list of notifications |
| Fetch a single notification | Get full details of a specific notification |
| Mark notification as read | Update read status |
| Mark all notifications as read | Bulk update read status |
| Get unread notification count | Badge count for UI |
| Create a notification (admin/system) | Send a new notification to student(s) |
| Delete a notification | Soft-delete a notification |

---

### REST API Endpoints

#### 1. GET `/api/v1/notifications`

**Description:** Fetch all notifications for the authenticated student (paginated).

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Items per page |
| `type` | string | No | all | Filter: `Placement`, `Result`, `Event` |
| `isRead` | boolean | No | — | Filter by read status |
| `sortBy` | string | No | `createdAt` | Sort field |
| `order` | string | No | `desc` | Sort order: `asc` / `desc` |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
        "type": "Result",
        "message": "mid-sem",
        "isRead": false,
        "createdAt": "2026-04-22T17:51:30Z",
        "updatedAt": "2026-04-22T17:51:30Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 98,
      "itemsPerPage": 20
    }
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired access token"
  }
}
```

---

#### 2. GET `/api/v1/notifications/:id`

**Description:** Fetch a single notification by its ID.

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "type": "Result",
    "message": "mid-sem",
    "isRead": false,
    "studentId": 1042,
    "createdAt": "2026-04-22T17:51:30Z",
    "updatedAt": "2026-04-22T17:51:30Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Notification not found"
  }
}
```

---

#### 3. PATCH `/api/v1/notifications/:id/read`

**Description:** Mark a single notification as read.

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "isRead": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "isRead": true,
    "updatedAt": "2026-04-22T18:00:00Z"
  }
}
```

---

#### 4. PATCH `/api/v1/notifications/read-all`

**Description:** Mark all notifications for the authenticated student as read.

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "updatedCount": 42,
    "message": "All notifications marked as read"
  }
}
```

---

#### 5. GET `/api/v1/notifications/unread-count`

**Description:** Get the count of unread notifications (for badge display).

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "unreadCount": 15
  }
}
```

---

#### 6. POST `/api/v1/notifications` (Admin/System)

**Description:** Create and dispatch a new notification to one or more students.

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "type": "Placement",
  "message": "Google Inc. hiring for SDE-1 role",
  "studentIds": [1042, 1043, 1044],
  "broadcast": false
}
```

For broadcast to all students:
```json
{
  "type": "Event",
  "message": "Annual Tech Fest 2026",
  "broadcast": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "notificationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "Placement",
    "message": "Google Inc. hiring for SDE-1 role",
    "recipientCount": 3,
    "createdAt": "2026-04-22T18:10:00Z"
  }
}
```

---

#### 7. DELETE `/api/v1/notifications/:id`

**Description:** Soft-delete a notification.

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Notification deleted successfully"
  }
}
```

---

### Real-Time Notification Mechanism

For delivering notifications in real-time, I recommend **Server-Sent Events (SSE)** over WebSockets for this use case:

**Why SSE over WebSocket:**
- Notifications flow **one-directionally** (server → client)
- SSE is simpler, uses standard HTTP, and auto-reconnects
- No need for bidirectional communication
- Works through firewalls/proxies without special configuration
- Native browser support via `EventSource` API

**Endpoint:** `GET /api/v1/notifications/stream`

**Headers:**
```
Authorization: Bearer <access_token>
Accept: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Server Response (SSE stream):**
```
event: notification
data: {"id":"abc123","type":"Placement","message":"Google hiring","timestamp":"2026-04-22T18:10:00Z"}

event: notification
data: {"id":"def456","type":"Result","message":"mid-sem results","timestamp":"2026-04-22T18:15:00Z"}

event: heartbeat
data: {"timestamp":"2026-04-22T18:20:00Z"}
```

**Client Implementation:**
```javascript
const eventSource = new EventSource('/api/v1/notifications/stream', {
  headers: { 'Authorization': 'Bearer <token>' }
});

eventSource.addEventListener('notification', (event) => {
  const notification = JSON.parse(event.data);
  // Update UI with new notification
  displayNotification(notification);
  updateBadgeCount();
});

eventSource.addEventListener('heartbeat', () => {
  // Connection alive
});

eventSource.onerror = () => {
  // Auto-reconnect is handled by EventSource
};
```

---

### JSON Schemas

**Notification Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "studentId": { "type": "integer" },
    "type": { "type": "string", "enum": ["Placement", "Result", "Event"] },
    "message": { "type": "string", "maxLength": 500 },
    "isRead": { "type": "boolean", "default": false },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" },
    "deletedAt": { "type": ["string", "null"], "format": "date-time" }
  },
  "required": ["id", "studentId", "type", "message"]
}
```

**Error Response Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean", "const": false },
    "error": {
      "type": "object",
      "properties": {
        "code": { "type": "string" },
        "message": { "type": "string" }
      }
    }
  }
}
```

---
---

## Stage 2: Database Schema & Persistent Storage

### Storage Choice: PostgreSQL (Relational Database)

**Why PostgreSQL:**

1. **ACID Compliance:** Notifications are critical — students must not miss placement updates. PostgreSQL guarantees data integrity through ACID transactions.
2. **Rich Querying:** We need complex filters (by type, read status, date range, student). SQL excels at this.
3. **ENUM Support:** Native `ENUM` type for `notification_type` ensures data consistency.
4. **Indexing:** B-tree, GIN, and partial indexes enable fast lookups on frequently queried columns.
5. **Scalability:** Supports table partitioning, read replicas, and connection pooling for growth.
6. **JSON Support:** `JSONB` column available if we need flexible metadata later.

### Database Schema

```sql
-- ─── Students Table ───
CREATE TABLE students (
    id              SERIAL PRIMARY KEY,
    roll_no         VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    department      VARCHAR(100),
    year            INTEGER CHECK (year BETWEEN 1 AND 5),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Notification Type Enum ───
CREATE TYPE notification_type AS ENUM ('Placement', 'Result', 'Event');

-- ─── Notifications Table ───
CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    notification_type   notification_type NOT NULL,
    message             VARCHAR(500) NOT NULL,
    is_read             BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at          TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- ─── Indexes ───

-- Primary query: fetch unread notifications for a student, ordered by time
CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, is_read, created_at DESC)
    WHERE deleted_at IS NULL;

-- Filter by type
CREATE INDEX idx_notifications_type
    ON notifications (notification_type, created_at DESC)
    WHERE deleted_at IS NULL;

-- Unread count (partial index — very efficient)
CREATE INDEX idx_notifications_unread_count
    ON notifications (student_id)
    WHERE is_read = FALSE AND deleted_at IS NULL;
```

### Entity Relationship

```
students (1) ────── (N) notifications
```

### Scalability Considerations

| Problem | Solution |
|---------|----------|
| Table grows to millions of rows | **Table Partitioning** by `created_at` (monthly partitions) |
| Slow reads with large data | **Read Replicas** for notification reads |
| High concurrent connections | **PgBouncer** connection pooling |
| Old data accumulation | **Archival Strategy**: move notifications older than 6 months to archive table |
| Cross-region latency | **Regional replicas** with eventual consistency |

### SQL Queries for REST APIs

**1. Fetch paginated notifications for a student:**
```sql
SELECT id, notification_type, message, is_read, created_at
FROM notifications
WHERE student_id = $1
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

**2. Mark a notification as read:**
```sql
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE id = $1 AND student_id = $2 AND deleted_at IS NULL;
```

**3. Mark all notifications as read:**
```sql
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE student_id = $1 AND is_read = FALSE AND deleted_at IS NULL;
```

**4. Get unread count:**
```sql
SELECT COUNT(*)
FROM notifications
WHERE student_id = $1 AND is_read = FALSE AND deleted_at IS NULL;
```

**5. Create a notification:**
```sql
INSERT INTO notifications (student_id, notification_type, message)
VALUES ($1, $2, $3)
RETURNING id, notification_type, message, is_read, created_at;
```

**6. Soft-delete a notification:**
```sql
UPDATE notifications
SET deleted_at = NOW(), updated_at = NOW()
WHERE id = $1 AND student_id = $2 AND deleted_at IS NULL;
```

**7. Broadcast notification to all students:**
```sql
INSERT INTO notifications (student_id, notification_type, message)
SELECT id, $1, $2
FROM students;
```

---
---

## Stage 3: Query Optimization

### The Slow Query

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

### Why Is It Slow?

1. **No composite index:** Without a proper index, PostgreSQL performs a **full table scan** across potentially millions of rows, checking each row's `studentID` and `isRead` values.
2. **`SELECT *`:** Retrieves ALL columns including large `message` text, forcing the DB to fetch full row data even if only a few columns are needed.
3. **Sorting without index:** `ORDER BY createdAt DESC` requires an in-memory sort (or disk-based sort for large results), which is expensive.
4. **No LIMIT:** Returns ALL unread notifications — could be thousands of rows per student.

### Fix: Add a Composite Index

```sql
CREATE INDEX idx_notifications_student_unread_time
    ON notifications (studentID, isRead, createdAt DESC)
    WHERE isRead = false;
```

This is a **partial index** that:
- Only includes rows where `isRead = false` (much smaller than the full table)
- Is already sorted by `createdAt DESC` (avoids sort step)
- Covers the exact query pattern

**Improved query:**
```sql
SELECT id, notification_type, message, is_read, created_at
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC
LIMIT 50;
```

### Estimated Computation Cost

| Scenario | Without Index | With Composite Index |
|----------|--------------|---------------------|
| Table Size | 5,000,000 rows | 5,000,000 rows |
| Rows Scanned | 5,000,000 (full scan) | ~50 (index seek) |
| Sort Operation | Yes (in-memory/disk) | No (pre-sorted index) |
| Estimated Time | 2-5 seconds | < 5 milliseconds |

### Should We Add Indexes on Every Column?

**No.** This is **bad advice.** Here's why:

1. **Write Performance:** Every `INSERT`, `UPDATE`, and `DELETE` must also update every index. With 5M notifications and frequent writes (new notifications constantly arriving), this creates severe write amplification.

2. **Storage Overhead:** Each index consumes disk space. With 10+ columns, indexes could exceed the table size itself.

3. **Planner Confusion:** Too many indexes can confuse the query planner, causing it to pick suboptimal execution plans.

4. **Maintenance Cost:** More indexes = longer `VACUUM` and `REINDEX` operations.

**Best Practice:** Create indexes only for the specific query patterns your application uses.

### Query: Find students with Placement notifications in last 7 days

```sql
SELECT DISTINCT s.id, s.roll_no, s.name, s.email
FROM students s
INNER JOIN notifications n ON s.id = n.student_id
WHERE n.notification_type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days'
  AND n.deleted_at IS NULL;
```

**Supporting index:**
```sql
CREATE INDEX idx_notifications_placement_recent
    ON notifications (notification_type, created_at DESC)
    WHERE notification_type = 'Placement' AND deleted_at IS NULL;
```

---
---

## Stage 4: Caching Strategy

### Problem

Notifications are fetched on every page load for every student. With 50,000 students, the database is overwhelmed.

### Proposed Solution: Redis Caching Layer

Introduce **Redis** as a caching layer between the application and PostgreSQL.

### Architecture

```
Client → API Server → Redis Cache (check first) → PostgreSQL (if cache miss)
```

### Caching Strategies Comparison

| Strategy | How It Works | Pros | Cons |
|----------|-------------|------|------|
| **Cache-Aside (Lazy Loading)** | App checks cache first; on miss, queries DB and populates cache | Simple, only caches accessed data | First request always slow (cache miss), possible stale data |
| **Write-Through** | Every write goes to both cache and DB | Cache always up-to-date | Higher write latency, caches data that may never be read |
| **Write-Behind (Write-Back)** | Write to cache immediately, async flush to DB | Fastest writes | Risk of data loss if cache crashes before flush |
| **Read-Through** | Cache itself fetches from DB on miss | Clean abstraction | Requires cache-aware data layer |

### Recommended: Cache-Aside + TTL + Event-Based Invalidation

**Implementation:**

1. **Cache Key Pattern:** `notifications:{studentId}:unread`
2. **TTL:** 60 seconds (short enough to stay fresh, long enough to reduce DB load)
3. **Invalidation:** When a new notification is created or marked as read, invalidate that student's cache key

```javascript
// Pseudo-code for Cache-Aside pattern

async function getUnreadNotifications(studentId) {
    const cacheKey = `notifications:${studentId}:unread`;

    // 1. Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);  // Cache HIT
    }

    // 2. Cache MISS — query DB
    const notifications = await db.query(
        `SELECT * FROM notifications
         WHERE student_id = $1 AND is_read = false AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 50`,
        [studentId]
    );

    // 3. Populate cache with TTL
    await redis.setex(cacheKey, 60, JSON.stringify(notifications));

    return notifications;
}

// Invalidate on write
async function onNotificationCreated(studentId) {
    await redis.del(`notifications:${studentId}:unread`);
}
```

### Additional Optimisation: Unread Count Cache

Cache the unread count separately since it's fetched most frequently (badge display):

```javascript
const countKey = `notifications:${studentId}:unread_count`;
await redis.setex(countKey, 30, unreadCount);
```

### Tradeoffs

| Aspect | Without Cache | With Cache |
|--------|--------------|------------|
| Read Latency | 50-200ms (DB query) | 1-5ms (Redis) |
| DB Load | 50K queries/min | ~500 queries/min (99% cache hit) |
| Data Freshness | Always real-time | Up to 60s stale |
| Complexity | Simple | Moderate (cache invalidation logic) |
| Infrastructure | DB only | DB + Redis |

---
---

## Stage 5: Reliable Bulk Notification System

### The Current Implementation

```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)    # calls Email API
        save_to_db(student_id, message)    # DB Insert
        push_to_app(student_id, message)   # Real-time push
```

### Shortcomings

1. **Sequential Processing:** Sending to 50,000 students one-by-one takes hours. If each email takes 100ms, that's 5,000 seconds (~83 minutes).

2. **No Fault Tolerance:** If `send_email` fails for student #200, the loop might crash. Students #201–50,000 get nothing.

3. **Partial Failure State:** If email succeeds but `save_to_db` fails for a student, the system is in an inconsistent state — student got the email but has no DB record.

4. **No Retry Mechanism:** Failed operations are lost forever with no way to retry.

5. **Blocking:** The HR user's request blocks for the entire duration. No async processing.

6. **No Idempotency:** If the system crashes and restarts, re-running the function sends duplicate emails to students who already received them.

### Should DB Save and Email Happen Together?

**No, they should NOT be in the same synchronous transaction.** Here's why:

- Email is an **external I/O** operation that can take seconds and is unreliable
- DB operations should be fast and atomic
- Coupling them means a slow email API can hold open DB transactions, causing connection pool exhaustion
- If the email API is down, no DB records get created either

**Correct approach:** **Separate them with a message queue.** Save to DB first (fast, reliable), then enqueue the email job. If the email fails, the DB record still exists, and the email can be retried.

### Redesigned Architecture

```
HR clicks "Notify All"
       │
       ▼
┌──────────────┐     ┌─────────────┐     ┌──────────────────┐
│  API Server  │────▶│ Message     │────▶│  Worker Pool     │
│  (fast ACK)  │     │ Queue       │     │  (N consumers)   │
└──────────────┘     │ (RabbitMQ/  │     │                  │
       │             │  Redis/SQS) │     │  ┌─ Email Worker  │
       │             └─────────────┘     │  ├─ DB Worker     │
       ▼                                 │  └─ Push Worker   │
  "Accepted –                            └──────────────────┘
   processing
   in background"
```

### Revised Pseudocode

```python
# ─── API Layer (fast response) ───
function notify_all(student_ids: array, message: string):
    # Generate a unique batch ID for idempotency
    batch_id = generate_uuid()

    # Create batch record for tracking
    save_batch_to_db(batch_id, student_ids, message, status="pending")

    # Enqueue individual jobs (fan-out)
    for student_id in student_ids:
        enqueue_job("notification_queue", {
            batch_id: batch_id,
            student_id: student_id,
            message: message,
            channels: ["email", "db", "push"],
            retry_count: 0,
            max_retries: 3
        })

    # Return immediately
    return { batch_id: batch_id, status: "accepted", total: len(student_ids) }


# ─── Worker (processes jobs concurrently) ───
function process_notification_job(job):
    # Step 1: Save to DB (must succeed first)
    try:
        notification_id = save_to_db(job.student_id, job.message)
    except DatabaseError:
        if job.retry_count < job.max_retries:
            requeue_with_backoff(job)
        else:
            log_to_dead_letter_queue(job)
        return

    # Step 2: Send email (async, can be retried independently)
    try:
        send_email(job.student_id, job.message)
        mark_email_sent(notification_id)
    except EmailError:
        enqueue_job("email_retry_queue", {
            notification_id: notification_id,
            student_id: job.student_id,
            message: job.message,
            retry_count: job.retry_count + 1
        })

    # Step 3: Push real-time notification
    try:
        push_to_app(job.student_id, job.message)
    except PushError:
        # Push failures are non-critical (student will see on next load)
        log_warning("Push failed for student", job.student_id)

    # Update batch progress
    update_batch_progress(job.batch_id)


# ─── Idempotency Guard ───
function save_to_db(student_id, message):
    # Use UPSERT to prevent duplicates
    INSERT INTO notifications (student_id, message, batch_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (student_id, batch_id) DO NOTHING
    RETURNING id;
```

### Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| Processing Time | ~83 minutes (sequential) | ~1-2 minutes (parallel workers) |
| Fault Tolerance | None | Retry with exponential backoff |
| Consistency | Partial failures | DB first, email retried separately |
| User Experience | Blocks for 83 min | Instant response ("accepted") |
| Idempotency | None (duplicates possible) | Batch ID + UPSERT |
| Observability | None | Batch tracking, progress, DLQ |

---
---

## Stage 6: Priority Inbox

### Design

The Priority Inbox displays the top 'n' most important **unread** notifications, ranked by:

1. **Type Weight:** `Placement (3) > Result (2) > Event (1)`
2. **Recency:** More recent notifications score higher

### Priority Score Formula

```
priorityScore = (typeWeight × 100) + recencyScore
```

Where:
- `typeWeight` = 3 (Placement), 2 (Result), 1 (Event)
- `recencyScore` = normalized value between 0 and 1, calculated as:

```
recencyScore = (timestamp - oldestTimestamp) / (newestTimestamp - oldestTimestamp)
```

The multiplier of 100 ensures that type always dominates recency (a Placement from yesterday still outranks a Result from today).

### Example Scoring

| Notification | Type | Recency Score | Priority Score |
|-------------|------|---------------|----------------|
| Google hiring | Placement | 0.95 | 3 × 100 + 0.95 = **300.95** |
| AMD hiring | Placement | 0.80 | 3 × 100 + 0.80 = **300.80** |
| Mid-sem results | Result | 1.00 | 2 × 100 + 1.00 = **201.00** |
| Project review | Result | 0.70 | 2 × 100 + 0.70 = **200.70** |
| Tech Fest | Event | 0.90 | 1 × 100 + 0.90 = **100.90** |

### Efficiently Maintaining Top-N with Streaming Data

When new notifications keep arriving, re-sorting the entire list is O(n log n). Instead, we use a **Min-Heap of size N**:

1. Maintain a min-heap of size N (the current top-N)
2. When a new notification arrives:
   - If heap size < N: insert directly → O(log N)
   - If new score > heap minimum: replace minimum and heapify → O(log N)
   - Otherwise: discard (it's not in top-N)

**Time Complexity:** O(log N) per new notification (vs O(n log n) for re-sort)

### Implementation

The working implementation is in the `notification_app_be/` folder:

- `src/priorityInbox.js` — Priority scoring + min-heap algorithm
- `src/apiClient.js` — Fetches notifications from evaluation server
- `src/index.js` — Express server with `/notifications/priority?n=10` endpoint

**To run:**
```bash
cd notification_app_be
npm install
npm start
# Visit: http://localhost:3002/notifications/priority?n=10
```

The API returns the top-N notifications sorted by priority score, with full transparency on how each score was computed.
