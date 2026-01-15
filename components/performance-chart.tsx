"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export interface PerformanceDataPoint {
  week: string
  average: number
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[]
}

// Demo data used when no real data is available
const demoData: PerformanceDataPoint[] = [
  { week: "Week 1", average: 65 },
  { week: "Week 2", average: 68 },
  { week: "Week 3", average: 72 },
  { week: "Week 4", average: 75 },
  { week: "Week 5", average: 78 },
  { week: "Week 6", average: 82 },
]

export function PerformanceChart({ data }: PerformanceChartProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Use demo data if no data provided or data is empty
  const chartData = data.length > 0 ? data : demoData
  const isDemo = data.length === 0

  if (!isMounted) {
    return <div className="h-[300px] flex items-center justify-center">Loading chart...</div>
  }

  return (
    <div className="relative">
      {isDemo && (
        <div className="absolute top-0 right-0 px-2 py-1 bg-amber-500/20 text-amber-500 text-xs rounded-md z-10">
          Demo Data
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 10,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="week" stroke="rgba(255,255,255,0.5)" />
          <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(14, 17, 23, 0.8)",
              borderColor: "rgba(255,255,255,0.1)",
              color: "white",
            }}
            formatter={(value: number) => [`${value}%`, "Average Score"]}
          />
          <Line
            type="monotone"
            dataKey="average"
            stroke="#00BFFF"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            name="Average Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
