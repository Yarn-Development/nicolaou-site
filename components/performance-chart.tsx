"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { name: "Week 1", Math: 65, Science: 78, English: 72, History: 68 },
  { name: "Week 2", Math: 68, Science: 75, English: 74, History: 70 },
  { name: "Week 3", Math: 72, Science: 77, English: 76, History: 73 },
  { name: "Week 4", Math: 75, Science: 80, English: 78, History: 75 },
  { name: "Week 5", Math: 78, Science: 82, English: 80, History: 77 },
  { name: "Week 6", Math: 82, Science: 85, English: 81, History: 80 },
]

export function PerformanceChart() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="h-[300px] flex items-center justify-center">Loading chart...</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 10,
          left: 0,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
        <YAxis stroke="rgba(255,255,255,0.5)" />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(14, 17, 23, 0.8)",
            borderColor: "rgba(255,255,255,0.1)",
            color: "white",
          }}
        />
        <Line
          type="monotone"
          dataKey="Math"
          stroke="#00BFFF"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="Science"
          stroke="#A259FF"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="English"
          stroke="#00FFC6"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="History"
          stroke="#FF6B6B"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
