export type Tick = {
  timestamp: number
  time: string
  price: number
}

export type Candle = {
  timestamp: number
  time: string
  open: number
  high: number
  low: number
  close: number
}

/**
 * Buckets tick/point data into OHLC candles.
 * @param ticks Array of { timestamp(ms), time(label), price }
 * @param bucketMs Bucket size in milliseconds (default 60s)
 */
export function bucketTicksToOHLC(ticks: Tick[], bucketMs = 60_000): Candle[] {
  if (!Array.isArray(ticks) || ticks.length === 0) return []

  // Ensure chronological order
  const sorted = [...ticks].sort((a, b) => a.timestamp - b.timestamp)

  const buckets = new Map<number, Candle>()

  for (const t of sorted) {
    const bucket = Math.floor(t.timestamp / bucketMs) * bucketMs
    const existing = buckets.get(bucket)

    if (!existing) {
      buckets.set(bucket, {
        timestamp: bucket,
        time: t.time,
        open: t.price,
        high: t.price,
        low: t.price,
        close: t.price,
      })
    } else {
      existing.high = Math.max(existing.high, t.price)
      existing.low = Math.min(existing.low, t.price)
      existing.close = t.price
    }
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, c]) => c)
}

export function getPriceExtent(candles: Candle[]): { min: number; max: number } {
  if (!candles.length) return { min: 0, max: 1 }
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const c of candles) {
    if (c.low < min) min = c.low
    if (c.high > max) max = c.high
  }
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1 }
  return { min, max }
}
