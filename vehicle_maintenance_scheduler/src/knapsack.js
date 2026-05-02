/**
 * 0/1 Knapsack solver using Dynamic Programming.
 *
 * Given a set of items (vehicles), each with a weight (Duration in hours)
 * and a value (Impact score), and a knapsack capacity (MechanicHours),
 * find the subset of items that maximises the total value without
 * exceeding the capacity.
 *
 * Time Complexity:  O(n * W)  where n = number of items, W = capacity
 * Space Complexity: O(n * W)  for the DP table
 *
 * No external algorithm libraries are used.
 */

/**
 * Solves the 0/1 Knapsack problem.
 *
 * @param {Array<{TaskID: string, Duration: number, Impact: number}>} items - Vehicles/tasks
 * @param {number} capacity - Maximum mechanic-hours available
 * @returns {{
 *   selectedItems: Array<{TaskID: string, Duration: number, Impact: number}>,
 *   totalImpact: number,
 *   totalDuration: number
 * }}
 */
function solveKnapsack(items, capacity) {
  const n = items.length;
  const W = capacity;

  // ─── Edge cases ───
  if (n === 0 || W <= 0) {
    return { selectedItems: [], totalImpact: 0, totalDuration: 0 };
  }

  // ─── Build DP table ───
  // dp[i][w] = max impact achievable using items 0..i-1 with capacity w
  const dp = Array.from({ length: n + 1 }, () =>
    new Array(W + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    const weight = item.Duration;
    const value = item.Impact;

    for (let w = 0; w <= W; w++) {
      // Don't take item i
      dp[i][w] = dp[i - 1][w];

      // Take item i (if it fits)
      if (weight <= w) {
        const takeValue = dp[i - 1][w - weight] + value;
        if (takeValue > dp[i][w]) {
          dp[i][w] = takeValue;
        }
      }
    }
  }

  // ─── Backtrack to find selected items ───
  const selectedItems = [];
  let w = W;

  for (let i = n; i >= 1; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      // Item i was included
      selectedItems.push(items[i - 1]);
      w -= items[i - 1].Duration;
    }
  }

  // Reverse to maintain original order
  selectedItems.reverse();

  const totalImpact = dp[n][W];
  const totalDuration = selectedItems.reduce((sum, item) => sum + item.Duration, 0);

  return { selectedItems, totalImpact, totalDuration };
}

module.exports = { solveKnapsack };
