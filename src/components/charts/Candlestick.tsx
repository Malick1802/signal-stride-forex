import React from "react"
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Customized,
} from "recharts"
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { Candle } from "@/utils/ohlc"

interface CandlestickChartProps {
  data: Candle[]
  yDomain?: [number, number]
  positiveColor?: string // up candles
  negativeColor?: string // down candles
  xTickFontSize?: number
  yTickFontSize?: number
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  yDomain,
  positiveColor = "hsl(var(--chart-2))",
  negativeColor = "hsl(var(--destructive))",
  xTickFontSize = 10,
  yTickFontSize = 10,
}) => {
  const formatPrice = (p: number) => p.toFixed(5)

  return (
    <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
      <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
      <XAxis
        dataKey="time"
        stroke="rgba(255,255,255,0.5)"
        fontSize={xTickFontSize}
        interval="preserveStartEnd"
      />
      <YAxis
        stroke="rgba(255,255,255,0.5)"
        fontSize={yTickFontSize}
        domain={yDomain as any}
        tickFormatter={formatPrice}
      />
      <ChartTooltip
        content={
          <ChartTooltipContent
            formatter={(value: any, _name, payload) => {
              const c = payload?.payload as Candle
              return [
                `${formatPrice(c.close)} (O:${formatPrice(c.open)} H:${formatPrice(c.high)} L:${formatPrice(c.low)})`,
                "Close",
              ]
            }}
            labelFormatter={(label) => `Time: ${label}`}
          />
        }
      />

      <Customized
        component={(props: any) => {
          const { xAxisMap, yAxisMap, offset, chartHeight } = props
          const xKey = Object.keys(xAxisMap)[0]
          const yKey = Object.keys(yAxisMap)[0]
          const xScale = xAxisMap[xKey].scale
          const yScale = yAxisMap[yKey].scale

          if (!xScale || !yScale) return null

          const items: React.ReactNode[] = []
          const n = data.length
          for (let i = 0; i < n; i++) {
            const d = data[i]
            const prev = data[i - 1]
            const next = data[i + 1]

            const x = xScale(d.time)
            if (x == null) continue

            const prevX = prev ? xScale(prev.time) : null
            const nextX = next ? xScale(next.time) : null
            const step = Math.min(
              nextX != null ? Math.abs(nextX - x) : Infinity,
              prevX != null ? Math.abs(x - prevX) : Infinity
            )
            const width = Math.max(3, isFinite(step) ? step * 0.6 : 6)

            const yOpen = yScale(d.open)
            const yClose = yScale(d.close)
            const yHigh = yScale(d.high)
            const yLow = yScale(d.low)

            const bullish = d.close >= d.open
            const color = bullish ? positiveColor : negativeColor

            const bodyTop = Math.min(yOpen, yClose)
            const bodyBottom = Math.max(yOpen, yClose)
            const bodyHeight = Math.max(1, bodyBottom - bodyTop)
            const cx = x - width / 2 + width / 2

            items.push(
              <g key={`candle-${i}`}>
                {/* Wick */}
                <line
                  x1={cx}
                  x2={cx}
                  y1={yHigh}
                  y2={yLow}
                  stroke={color}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                {/* Body */}
                <rect
                  x={x - width / 2}
                  y={bodyTop}
                  width={width}
                  height={bodyHeight}
                  fill={color}
                  stroke={color}
                  shapeRendering="crispEdges"
                  rx={1}
                  ry={1}
                />
              </g>
            )
          }

          return <g transform={`translate(${offset.left}, ${offset.top})`}>{items}</g>
        }}
      />
    </ComposedChart>
  )
}

export default CandlestickChart
