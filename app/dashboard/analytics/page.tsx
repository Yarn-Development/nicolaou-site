"use client"

import { useState, useEffect, useCallback } from "react"
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
  Download,
  AlertCircle,
  Database
} from "lucide-react"
import { 
  getAnalyticsData, 
  getTeacherClasses,
  type TopicPerformance,
  type WeeklyProgress,
  type OverallStats
} from "@/app/actions/analytics"

// =====================================================
// Demo/Fallback Data
// =====================================================

const demoTopicPerformance: TopicPerformance[] = [
  { topic: "Algebra", average: 78, improvement: 12, students: 24 },
  { topic: "Geometry", average: 82, improvement: 8, students: 24 },
  { topic: "Statistics", average: 75, improvement: 15, students: 24 },
  { topic: "Number", average: 85, improvement: 5, students: 24 },
  { topic: "Ratio", average: 80, improvement: 10, students: 24 },
]

const demoWeeklyProgress: WeeklyProgress[] = [
  { week: "Week 1", weekStart: "2026-01-01", completion: 65, average: 72 },
  { week: "Week 2", weekStart: "2026-01-08", completion: 78, average: 75 },
  { week: "Week 3", weekStart: "2026-01-15", completion: 82, average: 78 },
  { week: "Week 4", weekStart: "2026-01-22", completion: 88, average: 82 },
  { week: "Week 5", weekStart: "2026-01-29", completion: 92, average: 85 },
  { week: "Week 6", weekStart: "2026-02-05", completion: 89, average: 83 },
]

const demoOverallStats: OverallStats = {
  totalStudents: 247,
  completionRate: 87,
  activeLearners: 234,
  averageScore: 82,
  studentChange: 12,
  completionChange: 5,
  activeChange: 8,
  scoreChange: 3
}

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

// =====================================================
// Helper Components
// =====================================================

interface StatCardProps {
  title: string
  value: string
  change: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
  isDemo?: boolean
}

function StatCard({ title, value, change, icon: Icon, trend = "up", isDemo }: StatCardProps) {
  return (
    <Card className="glassmorphic relative">
      {isDemo && (
        <Badge variant="outline" className="absolute top-2 right-2 text-[10px] opacity-60">
          Demo
        </Badge>
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : trend === "down" ? (
            <TrendingDown className="h-3 w-3 text-red-500" />
          ) : (
            <div className="h-3 w-3" />
          )}
          <span className={
            trend === "up" ? "text-green-500" : 
            trend === "down" ? "text-red-500" : 
            "text-muted-foreground"
          }>
            {change}
          </span>
          {trend !== "neutral" && "from last period"}
        </p>
      </CardContent>
    </Card>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ElementType
}

function EmptyState({ title, description, icon: Icon = Database }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  )
}

interface DemoDataBannerProps {
  onDismiss?: () => void
}

function DemoDataBanner({ onDismiss }: DemoDataBannerProps) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-medium text-amber-700 dark:text-amber-400">
          Showing Demo Data
        </h4>
        <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
          No real analytics data available yet. Create classes, publish assignments, and grade submissions to see real data here.
        </p>
      </div>
      {onDismiss && (
        <Button variant="ghost" size="sm" onClick={onDismiss} className="text-amber-600">
          Dismiss
        </Button>
      )}
    </div>
  )
}

// =====================================================
// Custom Tooltip for Charts (handles null values)
// =====================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number | null; name: string; color: string }>
  label?: string
}

function CustomChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null
  
  return (
    <div className="bg-black/90 border border-white/10 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium mb-2">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value !== null ? `${entry.value}%` : 'No data'}
        </p>
      ))}
    </div>
  )
}

// =====================================================
// Time Range Mapping
// =====================================================

const timeRangeMap: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365
}

// =====================================================
// Main Component
// =====================================================

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d")
  const [selectedClass, setSelectedClass] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [showDemoBanner, setShowDemoBanner] = useState(true)
  
  // Data state
  const [topicPerformance, setTopicPerformance] = useState<TopicPerformance[]>([])
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([])
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null)
  const [hasRealData, setHasRealData] = useState(false)
  const [classes, setClasses] = useState<Array<{ id: string; name: string; subject: string }>>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch classes on mount
  useEffect(() => {
    async function fetchClasses() {
      const result = await getTeacherClasses()
      if (result.success && result.data) {
        setClasses(result.data)
      }
    }
    fetchClasses()
  }, [])

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const days = timeRangeMap[timeRange] || 30
      const result = await getAnalyticsData(days, selectedClass)
      
      if (result.success && result.data) {
        const { topicPerformance: tp, weeklyProgress: wp, overallStats: os, hasData } = result.data
        
        setHasRealData(hasData)
        
        if (hasData) {
          // Use real data
          setTopicPerformance(tp.length > 0 ? tp : demoTopicPerformance)
          setWeeklyProgress(wp.length > 0 ? wp : demoWeeklyProgress)
          setOverallStats(os)
          setShowDemoBanner(false)
        } else {
          // Fall back to demo data
          setTopicPerformance(demoTopicPerformance)
          setWeeklyProgress(demoWeeklyProgress)
          setOverallStats(demoOverallStats)
          setShowDemoBanner(true)
        }
      } else {
        // Error occurred, use demo data
        setError(result.error || "Failed to fetch analytics")
        setTopicPerformance(demoTopicPerformance)
        setWeeklyProgress(demoWeeklyProgress)
        setOverallStats(demoOverallStats)
        setHasRealData(false)
        setShowDemoBanner(true)
      }
    } catch (err) {
      console.error("Analytics fetch error:", err)
      setError("An unexpected error occurred")
      setTopicPerformance(demoTopicPerformance)
      setWeeklyProgress(demoWeeklyProgress)
      setOverallStats(demoOverallStats)
      setHasRealData(false)
      setShowDemoBanner(true)
    } finally {
      setIsLoading(false)
    }
  }, [timeRange, selectedClass])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Determine trends from change values
  const getTrend = (change: number): "up" | "down" | "neutral" => {
    if (change > 0) return "up"
    if (change < 0) return "down"
    return "neutral"
  }

  const formatChange = (change: number): string => {
    if (change === 0) return "No change"
    return `${change > 0 ? "+" : ""}${change}%`
  }

  // Current stats (with fallback)
  const stats = overallStats || demoOverallStats
  const isDemo = !hasRealData

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
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
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

      {/* Demo Data Banner */}
      {showDemoBanner && !isLoading && (
        <DemoDataBanner onDismiss={() => setShowDemoBanner(false)} />
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents.toString()}
          change={formatChange(stats.studentChange)}
          icon={Users}
          trend={getTrend(stats.studentChange)}
          isDemo={isDemo}
        />
        <StatCard
          title="Avg. Completion Rate"
          value={`${stats.completionRate}%`}
          change={formatChange(stats.completionChange)}
          icon={Target}
          trend={getTrend(stats.completionChange)}
          isDemo={isDemo}
        />
        <StatCard
          title="Active Learners"
          value={stats.activeLearners.toString()}
          change={formatChange(stats.activeChange)}
          icon={Brain}
          trend={getTrend(stats.activeChange)}
          isDemo={isDemo}
        />
        <StatCard
          title="Avg. Score"
          value={`${stats.averageScore}%`}
          change={formatChange(stats.scoreChange)}
          icon={Award}
          trend={getTrend(stats.scoreChange)}
          isDemo={isDemo}
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
            {/* Topic Performance Chart */}
            <Card className="glassmorphic relative">
              {isDemo && (
                <Badge variant="outline" className="absolute top-4 right-4 text-[10px] opacity-60 z-10">
                  Demo Data
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Topic Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topicPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topicPerformance}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="topic" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Bar 
                        dataKey="average" 
                        fill="#00BFFF" 
                        radius={[4, 4, 0, 0]}
                        name="Average Score"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState 
                    title="No Topic Data" 
                    description="Grade some assignments to see topic performance breakdown."
                  />
                )}
              </CardContent>
            </Card>

            {/* Weekly Progress Chart */}
            <Card className="glassmorphic relative">
              {isDemo && (
                <Badge variant="outline" className="absolute top-4 right-4 text-[10px] opacity-60 z-10">
                  Demo Data
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyProgress.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weeklyProgress}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="completion" 
                        stroke="#A259FF" 
                        strokeWidth={3}
                        dot={{ fill: '#A259FF', strokeWidth: 2, r: 4 }}
                        name="Completion Rate"
                        connectNulls
                      />
                      <Line 
                        type="monotone" 
                        dataKey="average" 
                        stroke="#00FFC6" 
                        strokeWidth={3}
                        dot={{ fill: '#00FFC6', strokeWidth: 2, r: 4 }}
                        name="Avg Score"
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState 
                    title="No Weekly Data" 
                    description="Submit and grade assignments to track weekly progress."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Performance Table */}
          <Card className="glassmorphic relative">
            {isDemo && (
              <Badge variant="outline" className="absolute top-4 right-4 text-[10px] opacity-60 z-10">
                Demo Data
              </Badge>
            )}
            <CardHeader>
              <CardTitle>Detailed Topic Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {topicPerformance.length > 0 ? (
                <div className="space-y-4">
                  {topicPerformance.map((topic) => (
                    <div key={topic.topic} className="flex items-center justify-between p-4 glassmorphic rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{topic.topic}</h4>
                        <p className="text-sm text-muted-foreground">
                          {topic.students} students • Average: {topic.average ?? 0}%
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge 
                            variant={(topic.improvement ?? 0) > 10 ? "default" : "secondary"}
                            className="mb-2"
                          >
                            {(topic.improvement ?? 0) >= 0 ? "+" : ""}{topic.improvement ?? 0}% improvement
                          </Badge>
                          <Progress value={topic.average ?? 0} className="w-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  title="No Topic Analysis Available" 
                  description="Complete some graded assignments to see detailed topic analysis."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glassmorphic relative">
              <Badge variant="outline" className="absolute top-4 right-4 text-[10px] opacity-60 z-10">
                Demo Data
              </Badge>
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
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="active" 
                      stroke="#00BFFF" 
                      fillOpacity={1} 
                      fill="url(#colorActive)"
                      name="Active Students"
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#A259FF" 
                      strokeDasharray="5 5"
                      name="Total Students"
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glassmorphic relative">
              <Badge variant="outline" className="absolute top-4 right-4 text-[10px] opacity-60 z-10">
                Demo Data
              </Badge>
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
            {topicPerformance.length > 0 ? (
              topicPerformance.map((topic) => (
                <Card key={topic.topic} className="glassmorphic relative">
                  {isDemo && (
                    <Badge variant="outline" className="absolute top-4 right-4 text-[10px] opacity-60 z-10">
                      Demo
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{topic.topic}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Class Average</span>
                      <span className="text-lg font-bold text-primary">{topic.average ?? 0}%</span>
                    </div>
                    <Progress value={topic.average ?? 0} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{topic.students} students</span>
                      <span className={(topic.improvement ?? 0) >= 0 ? "text-green-500" : "text-red-500"}>
                        {(topic.improvement ?? 0) >= 0 ? "+" : ""}{topic.improvement ?? 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3">
                <Card className="glassmorphic">
                  <CardContent className="py-12">
                    <EmptyState 
                      title="No Topics Yet" 
                      description="Create assignments with topics tagged to see topic-level analytics."
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="glassmorphic relative">
            {isDemo && (
              <Badge variant="outline" className="absolute top-4 right-4 text-[10px] opacity-60 z-10">
                Demo Data
              </Badge>
            )}
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
                    {hasRealData && stats.scoreChange > 0 ? (
                      <>
                        <li className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-green-500 rounded-full" />
                          Average score improved by {stats.scoreChange}% this period
                        </li>
                        {stats.completionChange > 0 && (
                          <li className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-green-500 rounded-full" />
                            Completion rate up by {stats.completionChange}%
                          </li>
                        )}
                        {stats.activeChange > 0 && (
                          <li className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-green-500 rounded-full" />
                            {stats.activeChange} more active learners this period
                          </li>
                        )}
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </ul>
                </div>
                
                <div className="glassmorphic p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-amber-500" />
                    Areas for Focus
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {hasRealData && topicPerformance.length > 0 ? (
                      <>
                        {topicPerformance
                          .filter(t => (t.average ?? 0) < 70)
                          .slice(0, 3)
                          .map(topic => (
                            <li key={topic.topic} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-amber-500 rounded-full" />
                              {topic.topic} needs reinforcement (avg: {topic.average}%)
                            </li>
                          ))}
                        {topicPerformance.filter(t => (t.average ?? 0) < 70).length === 0 && (
                          <li className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-green-500 rounded-full" />
                            All topics performing above 70% - great work!
                          </li>
                        )}
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
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
