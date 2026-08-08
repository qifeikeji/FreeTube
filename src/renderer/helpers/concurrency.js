/**
 * Run an async mapper over items with a fixed concurrency limit.
 * Results preserve input order.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<R>} mapper
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, concurrency, mapper) {
  if (items.length === 0) {
    return []
  }

  const limit = Math.max(1, Math.min(concurrency, items.length))
  /** @type {R[]} */
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex
      nextIndex += 1
      results[current] = await mapper(items[current], current)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}
