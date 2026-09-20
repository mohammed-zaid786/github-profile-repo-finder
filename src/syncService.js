// Helper function for delay
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 2. Exponential Backoff Engine
export async function syncWithExponentialBackoff(
  actionFn,
  maxRetries = 3,
  baseDelay = 1000,
  onStatus
) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      if (onStatus) onStatus(`Syncing... Attempt ${attempt + 1}/${maxRetries}`);

      // Action execute karo (e.g. server sync)
      const res = await actionFn();

      if (onStatus) onStatus("Sync Complete: Success!");
      return res;
    } catch (err) {
      attempt++;

      // Agar saare retries fail ho gaye
      if (attempt >= maxRetries) {
        if (onStatus) onStatus(`Sync Failed after ${maxRetries} attempts!`);
        throw err || new Error("Exponential backoff: All retries failed");
      }

      // Formula: baseDelay * 2^(attempt - 1) -> 1s, 2s, 4s...
      const delay = baseDelay * Math.pow(2, attempt - 1);
      if (onStatus) {
        onStatus(`Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`);
      }

      await wait(delay);
    }
  }
}