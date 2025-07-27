/**
 * Executes promises in parallel with a specified concurrency limit
 * @param {number} concurrencyLimit - Maximum number of promises to run in parallel
 * @param {Array} items - Array of items to process
 * @param {Function} promiseFn - Function that returns a promise for each item
 * @returns {Promise<Array>} Array of results in the same order as input items
 */
export async function mapPromisesParallely(concurrencyLimit, items, promiseFn) {
  if (!Array.isArray(items)) {
    throw new TypeError('Items must be an array');
  }

  if (typeof promiseFn !== 'function') {
    throw new TypeError('Promise function must be a function');
  }

  // Handle edge cases
  if (items.length === 0) return [];
  if (concurrencyLimit < 1) concurrencyLimit = 1;

  const results = new Array(items.length);
  let currentIndex = 0;

  // Create a pool of promises that maintains the concurrency limit
  const pool = new Set();

  // Process an item and store its result
  const processItem = async (item, index) => {
    try {
      const result = await promiseFn(item, index);
      results[index] = result;
    } catch (error) {
      results[index] = Promise.reject(error);
    }
  };

  while (currentIndex < items.length) {
    // Create a new promise for the current item
    const promise = processItem(items[currentIndex], currentIndex);
    pool.add(promise);

    // Remove the promise from the pool when it completes
    promise.finally(() => pool.delete(promise));

    currentIndex++;

    // Wait for a promise to complete if we've reached the concurrency limit
    if (pool.size >= concurrencyLimit) {
      await Promise.race(pool);
    }
  }

  // Wait for all remaining promises to complete
  await Promise.all(pool);

  return results;
}
