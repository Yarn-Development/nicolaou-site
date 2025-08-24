"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Award,
  Target,
  TrendingUp,
  Clock,
  Brain,
  FileText,
  Play,
  Calendar,
  Star,
  Zap,
  ChevronRight
} from "lucide-react"

// Mock student data
const studentProfile = {
  name: "Alex Johnson",
  email: "alex.j@example.com",
  grade: "Year 10",
  tier: "Higher",
  overallScore: 87,
  streak: 12,
  completedAssignments: 34,
  totalAssignments: 40,
  rank: 3,
  totalStudents: 28
}

const topicMastery = [
  { topic: "Algebra", mastery: 92, color: "#00BFFF", recent: true },
  { topic: "Geometry", mastery: 85, color: "#A259FF", recent: false },
  { topic: "Statistics", mastery: 78, color: "#00FFC6", recent: true },
  { topic: "Number", mastery: 94, color: "#FFB800", recent: false },
  { topic: "Ratio", mastery: 82, color: "#FF6B6B", recent: true }
]

const weeklyProgress = [
  { day: "Mon", score: 78, time: 45 },
  { day: "Tue", score: 82, time: 60 },
  { day: "Wed", score: 85, time: 55 },
  { day: "Thu", score: 88, time: 70 },
  { day: "Fri", score: 90, time: 65 },
  { day: "Sat", score: 87, time: 40 },
  { day: "Sun", score: 92, time: 30 }
]

const recentAssignments = [
  {
    id: 1,
    title: "Quadratic Equations Practice",
    topic: "Algebra",
    score: 94,
    completed: true,
    dueDate: "2 days ago",
    feedback: "Excellent work on factoring!"
  },
  {
    id: 2,
    title: "Trigonometry Applications",
    topic: "Geometry", 
    score: 87,
    completed: true,
    dueDate: "5 days ago",
    feedback: "Good understanding of SOH CAH TOA"
  },
  {
    id: 3,
    title: "Statistics Data Analysis",
    topic: "Statistics",
    score: null,
    completed: false,
    dueDate: "Due tomorrow",
    feedback: null
  },
  {
    id: 4,
    title: "Percentage Calculations",
    topic: "Number",
    score: null,
    completed: false,
    dueDate: "Due in 3 days", 
    feedback: null
  }
]

const upcomingTasks = [
  { id: 1, title: "Complete Statistics worksheet", type: "assignment", urgent: true },
  { id: 2, title: "Watch Trigonometry video", type: "lesson", urgent: false },
  { id: 3, title: "Practice test preparation", type: "practice", urgent: true },
  { id: 4, title: "Submit Algebra homework", type: "assignment", urgent: false }
]

const achievements = [
  { id: 1, title: "Perfect Week", description: "Completed all assignments this week", earned: true, icon: Star },
  { id: 2, title: "Math Streak", description: "12 days of continuous practice", earned: true, icon: Zap },
  { id: 3, title: "Top Performer", description: "Ranked in top 5 of class", earned: true, icon: Trophy },
  { id: 4, title: "Quick Learner", description: "Completed 3 topics ahead of schedule", earned: false, icon: Brain }
]

function Trophy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55.47.98 1.01 1.02 1.51.11 2.98-.78 2.99-2.02v-2.34"/>
      <circle cx="12" cy="12" r="8"/>
    </svg>
  )
}

export default function StudentDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("week")

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon,
    color = "primary"
  }: {
    title: string
    value: string | number
    subtitle?: string
    icon: any
    color?: string
  }) => (
    <Card className="glassmorphic">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header with student profile */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="/placeholder-avatar.jpg" />
            <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
              {studentProfile.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {studentProfile.name.split(' ')[0]}!</h1>
            <p className="text-muted-foreground">
              {studentProfile.grade} • {studentProfile.tier} Tier • Rank #{studentProfile.rank} of {studentProfile.totalStudents}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            <Zap className="h-3 w-3 mr-1" />
            {studentProfile.streak} day streak
          </Badge>
          <Badge variant="outline" className="border-accent/50 text-accent">
            Overall: {studentProfile.overallScore}%
          </Badge>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Assignments Complete"
          value={`${studentProfile.completedAssignments}/${studentProfile.totalAssignments}`}
          subtitle={`${Math.round((studentProfile.completedAssignments / studentProfile.totalAssignments) * 100)}% completion rate`}
          icon={FileText}
        />
        <StatCard
          title="Current Streak"
          value={`${studentProfile.streak} days`}
          subtitle="Keep it up!"
          icon={Zap}
        />
        <StatCard
          title="Class Ranking"
          value={`#${studentProfile.rank}`}
          subtitle={`Top ${Math.round((studentProfile.rank / studentProfile.totalStudents) * 100)}%`}
          icon={Award}
        />
        <StatCard
          title="Study Time"
          value="12.5 hrs"
          subtitle="This week"
          icon={Clock}
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="glassmorphic grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Topic Mastery */}
            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Topic Mastery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topicMastery.map((topic) => (
                    <div key={topic.topic} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium flex items-center gap-2">
                          {topic.topic}
                          {topic.recent && <Badge variant="secondary" className="text-xs">Recent</Badge>}
                        </span>
                        <span className="text-sm font-bold" style={{ color: topic.color }}>
                          {topic.mastery}%
                        </span>
                      </div>
                      <Progress value={topic.mastery} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Progress Chart */}
            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={weeklyProgress}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00BFFF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00BFFF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#00BFFF" 
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Tasks */}
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 glassmorphic rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        task.type === 'assignment' ? 'bg-primary/20 text-primary' :
                        task.type === 'lesson' ? 'bg-secondary/20 text-secondary' :
                        'bg-accent/20 text-accent'
                      }`}>
                        {task.type === 'assignment' ? <FileText className="h-4 w-4" /> :
                         task.type === 'lesson' ? <Play className="h-4 w-4" /> :
                         <Target className="h-4 w-4" />}
                      </div>
                      <span className="font-medium">{task.title}</span>
                      {task.urgent && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                    </div>
                    <Button size="sm" variant="ghost" className="text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-4 glassmorphic rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">{assignment.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{assignment.topic}</Badge>
                        <span className="text-xs text-muted-foreground">{assignment.dueDate}</span>
                      </div>
                      {assignment.feedback && (
                        <p className="text-sm text-muted-foreground italic">"{assignment.feedback}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {assignment.completed ? (
                        <Badge variant="outline" className="text-green-500 border-green-500/50">
                          {assignment.score}%
                        </Badge>
                      ) : (
                        <Button size="sm" className="bg-primary hover:bg-primary/90">
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle>Overall Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="relative w-32 h-32 mx-auto">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" data={[{ value: studentProfile.overallScore }]}>
                        <RadialBar dataKey="value" cornerRadius={10} fill="#00BFFF" />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{studentProfile.overallScore}%</div>
                        <div className="text-xs text-muted-foreground">Overall</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Completed Assignments</span>
                      <span>{studentProfile.completedAssignments}/{studentProfile.totalAssignments}</span>
                    </div>
                    <Progress value={(studentProfile.completedAssignments / studentProfile.totalAssignments) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glassmorphic">
              <CardHeader>
                <CardTitle>Topic Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={topicMastery}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="mastery"
                    >
                      {topicMastery.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {topicMastery.map((item) => (
                    <div key={item.topic} className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs">{item.topic}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="practice" className="space-y-4">
          <Card className="glassmorphic">
            <CardHeader>
              <CardTitle>Practice Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  AI-powered practice recommendations will appear here
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Personalized questions based on your learning gaps
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {achievements.map((achievement) => (
              <Card key={achievement.id} className={`glassmorphic ${achievement.earned ? 'glow-border-mint' : 'opacity-50'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <achievement.icon className={`h-5 w-5 ${achievement.earned ? 'text-accent' : 'text-muted-foreground'}`} />
                    {achievement.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  {achievement.earned && (
                    <Badge variant="secondary" className="mt-2 bg-accent/20 text-accent">
                      Earned
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}