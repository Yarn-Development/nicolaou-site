"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Award, 
  Target,
  Brain,
  BarChart3,
  Download
} from "lucide-react"

// Mock analytics data
const classPerformanceData = [
  { topic: "Algebra", average: 78, improvement: 12, students: 24 },
  { topic: "Geometry", average: 82, improvement: 8, students: 24 },
  { topic: "Statistics", average: 75, improvement: 15, students: 24 },
  { topic: "Number", average: 85, improvement: 5, students: 24 },
  { topic: "Ratio", average: 80, improvement: 10, students: 24 },
]

const weeklyProgressData = [
  { week: "Week 1", completion: 65, average: 72 },
  { week: "Week 2", completion: 78, average: 75 },
  { week: "Week 3", completion: 82, average: 78 },
  { week: "Week 4", completion: 88, average: 82 },
  { week: "Week 5", completion: 92, average: 85 },
  { week: "Week 6", completion: 89, average: 83 },
]

const difficultyDistribution = [
  { name: "Foundation", value: 40, color: "#00BFFF" },
  { name: "Intermediate", value: 35, color: "#A259FF" },
  { name: "Advanced", value: 25, color: "#00FFC6" },
]

const studentEngagementData = [
  { month: "Sep", active: 220, total: 250 },
  { month: "Oct", active: 235, total: 250 },
  { month: "Nov", active: 248, total: 250 },
  { month: "Dec", active: 245, total: 250 },
  { month: "Jan", active: 252, total: 260 },
  { month: "Feb", active: 258, total: 260 },
]

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d")
  const [selectedClass, setSelectedClass] = useState("all")

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    trend = "up" 
  }: {
    title: string
    value: string
    change: string
    icon: React.ElementType
    trend?: "up" | "down"
  }) => (
    <Card className="glassmorphic">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span className={trend === "up" ? "text-green-500" : "text-red-500"}>
            {change}
          </span>
          from last period
        </p>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track student progress and identify learning opportunities
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[180px] glassmorphic border-muted/30">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="class-a">Class 9A</SelectItem>
              <SelectItem value="class-b">Class 9B</SelectItem>
              <SelectItem value="class-c">Class 10A</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px] glassmorphic border-muted/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button className="glassmorphic hover:glow-border">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value="247"
          change="+12%"
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Avg. Completion Rate"
          value="87%"
          change="+5%"
          icon={Target}
          trend="up"
        />
        <StatCard
          title="Active Learners"
          value="234"
          change="+8%"
          icon={Brain}
          trend="up"
        />
        <StatCard
          title="Avg. Score"
          value="82%"
          change="+3%"
          icon={Award}
          trend="up"
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="glassmorphic grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Class Performance Chart */}
            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Topic Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={classPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="topic" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: 'none',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="average" fill="#00BFFF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Weekly Progress */}
            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyProgressData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="completion" 
                      stroke="#A259FF" 
                      strokeWidth={3}
                      dot={{ fill: '#A259FF', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="average" 
                      stroke="#00FFC6" 
                      strokeWidth={3}
                      dot={{ fill: '#00FFC6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Performance Table */}
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Detailed Topic Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {classPerformanceData.map((topic) => (
                  <div key={topic.topic} className="flex items-center justify-between p-4 glassmorphic rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">{topic.topic}</h4>
                      <p className="text-sm text-muted-foreground">
                        {topic.students} students • Average: {topic.average}%
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge 
                          variant={topic.improvement > 10 ? "default" : "secondary"}
                          className="mb-2"
                        >
                          +{topic.improvement}% improvement
                        </Badge>
                        <Progress value={topic.average} className="w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle>Student Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={studentEngagementData}>
                    <defs>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00BFFF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00BFFF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="active" 
                      stroke="#00BFFF" 
                      fillOpacity={1} 
                      fill="url(#colorActive)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#A259FF" 
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle>Difficulty Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={difficultyDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {difficultyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {difficultyDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            {classPerformanceData.map((topic) => (
              <Card key={topic.topic} className="glassmorphic">
                <CardHeader>
                  <CardTitle className="text-lg">{topic.topic}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Class Average</span>
                    <span className="text-lg font-bold text-primary">{topic.average}%</span>
                  </div>
                  <Progress value={topic.average} className="h-2" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{topic.students} students</span>
                    <span className="text-green-500">+{topic.improvement}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Learning Trends & Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="glassmorphic p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Positive Trends
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-green-500 rounded-full" />
                      Statistics performance improved by 15% this month
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-green-500 rounded-full" />
                      Student engagement increased by 8% overall
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-green-500 rounded-full" />
                      Completion rates are above target by 7%
                    </li>
                  </ul>
                </div>
                
                <div className="glassmorphic p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-amber-500" />
                    Areas for Focus
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-amber-500 rounded-full" />
                      Algebra concepts need reinforcement for 12 students
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-amber-500 rounded-full" />
                      Geometry visual reasoning showing slower progress
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-amber-500 rounded-full" />
                      Weekend activity drops by 23%
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}