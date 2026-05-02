
const TYPE_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

// How much to weight type vs recency (higher = type matters more)
const TYPE_WEIGHT_MULTIPLIER = 100;


function computeRecencyScore(timestampMs, oldestMs, newestMs) {
  if (newestMs === oldestMs) return 1; // All same time
  return (timestampMs - oldestMs) / (newestMs - oldestMs);
}


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


class PriorityInboxHeap {
  constructor(maxSize = 10) {
    this.maxSize = maxSize;
    this.heap = []; // min-heap based on priorityScore
  }

  
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
