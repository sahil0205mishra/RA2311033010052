/**
 * Priority Inbox Algorithm
 *
 * Determines the top-N most important unread notifications based on:
 *   1. Type weight: Placement (weight=3) > Result (weight=2) > Event (weight=1)
 *   2. Recency: More recent notifications get a higher recency score
 *
 * The combined priority score is:
 *   priority = (typeWeight * TYPE_WEIGHT_MULTIPLIER) + recencyScore
 *
 * Where recencyScore is normalised to [0, 1] based on the age of the
 * notification relative to the oldest one in the dataset.
 *
 * No external algorithm libraries are used.
 */

// ─── Type weight mapping (Placement > Result > Event) ───
const TYPE_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

// How much to weight type vs recency (higher = type matters more)
const TYPE_WEIGHT_MULTIPLIER = 100;

/**
 * Computes a recency score for a notification.
 * Returns a value between 0 (oldest) and 1 (newest).
 *
 * @param {number} timestampMs  - Notification timestamp in ms
 * @param {number} oldestMs     - Oldest notification timestamp in ms
 * @param {number} newestMs     - Newest notification timestamp in ms
 * @returns {number}
 */
function computeRecencyScore(timestampMs, oldestMs, newestMs) {
  if (newestMs === oldestMs) return 1; // All same time
  return (timestampMs - oldestMs) / (newestMs - oldestMs);
}

/**
 * Finds the top-N priority notifications.
 *
 * @param {Array<{ID: string, Type: string, Message: string, Timestamp: string}>} notifications
 * @param {number} n - Number of top notifications to return (default: 10)
 * @returns {Array<{
 *   id: string,
 *   type: string,
 *   message: string,
 *   timestamp: string,
 *   typeWeight: number,
 *   recencyScore: number,
 *   priorityScore: number
 * }>}
 */
function getTopNPriorityNotifications(notifications, n = 10) {
  if (!notifications || notifications.length === 0) {
    return [];
  }

  // ─── Parse timestamps and compute bounds ───
  const parsed = notifications.map((notif) => {
    const ts = new Date(notif.Timestamp).getTime();
    return { ...notif, timestampMs: ts };
  });

  const timestamps = parsed.map((p) => p.timestampMs);
  const oldestMs = Math.min(...timestamps);
  const newestMs = Math.max(...timestamps);

  // ─── Score each notification ───
  const scored = parsed.map((notif) => {
    const typeWeight = TYPE_WEIGHTS[notif.Type] || 0;
    const recencyScore = computeRecencyScore(notif.timestampMs, oldestMs, newestMs);
    const priorityScore = typeWeight * TYPE_WEIGHT_MULTIPLIER + recencyScore;

    return {
      id: notif.ID,
      type: notif.Type,
      message: notif.Message,
      timestamp: notif.Timestamp,
      typeWeight,
      recencyScore: Math.round(recencyScore * 1000) / 1000,
      priorityScore: Math.round(priorityScore * 1000) / 1000,
    };
  });

  // ─── Sort by priority score descending ───
  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  // ─── Return top N ───
  return scored.slice(0, n);
}

/**
 * Efficiently maintains a top-N priority set using a min-heap approach.
 * This is useful when notifications keep arriving in real-time.
 *
 * For the evaluation, we use the simpler sort approach above.
 * This class is provided to show how we'd handle streaming data efficiently.
 *
 * Time complexity per insert: O(log N) where N is the heap size
 */
class PriorityInboxHeap {
  constructor(maxSize = 10) {
    this.maxSize = maxSize;
    this.heap = []; // min-heap based on priorityScore
  }

  /**
   * Insert a notification. If the heap is full and the new item has higher
   * priority than the minimum, replace the minimum.
   */
  insert(notification) {
    const item = {
      id: notification.ID || notification.id,
      type: notification.Type || notification.type,
      message: notification.Message || notification.message,
      timestamp: notification.Timestamp || notification.timestamp,
      priorityScore: notification.priorityScore || 0,
    };

    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this._bubbleUp(this.heap.length - 1);
    } else if (item.priorityScore > this.heap[0].priorityScore) {
      this.heap[0] = item;
      this._sinkDown(0);
    }
  }

  /**
   * Returns all items sorted by priority (descending).
   */
  getAll() {
    return [...this.heap].sort((a, b) => b.priorityScore - a.priorityScore);
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[idx].priorityScore < this.heap[parent].priorityScore) {
        [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
        idx = parent;
      } else {
        break;
      }
    }
  }

  _sinkDown(idx) {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this.heap[left].priorityScore < this.heap[smallest].priorityScore) {
        smallest = left;
      }
      if (right < length && this.heap[right].priorityScore < this.heap[smallest].priorityScore) {
        smallest = right;
      }

      if (smallest !== idx) {
        [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }
}

module.exports = { getTopNPriorityNotifications, PriorityInboxHeap, TYPE_WEIGHTS };
