"use client";

import { useMemo, memo } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import { 
  Users, Target, CheckCircle2, TrendingUp, AlertTriangle, 
  Clock, Activity, AlertOctagon, Lightbulb, ShieldAlert,
  BarChart3, PieChart as PieChartIcon, Sparkles, Zap
} from "lucide-react";

export interface AdminAnalyticsData {
  kpis: {
    totalEmployees: number;
    totalGoals: number;
    approvalRate: number;
    averageProgress: number;
    atRiskGoals: number;
    overdueGoals: number;
    teamCompletionPct: number;
    orgHealthScore: number;
    averagePerformanceScore: number;
  };
  quarterlyTrends: { name: string; progress: number; expected: number }[];
  departmentPerformance: { department: string; averageProgress: number; goalsCount: number }[];
  approvalTrends: { month: string; approved: number; rejected: number; revisions: number }[];
  goalStatusDistribution: { name: string; value: number; fill: string }[];
  predictiveRisk: { riskLevel: string; count: number; fill: string }[];
  performanceDistribution: { grade: string; count: number; fill: string }[];
  teamCompletion: { team: string; completion: number }[];
  insights: { id: string; title: string; description: string; type: "success" | "warning" | "critical" | "info" }[];
  criticalAlerts: { id: string; title: string; message: string; severity: "high" | "medium" }[];
  managerEffectiveness: { manager: string; teamSize: number; approvalTimeDays: number; teamProgress: number }[];
  departmentLeaderboard: { department: string; score: number; rank: number; grade: string }[];
}

interface AdminAnalyticsDashboardProps {
  data: AdminAnalyticsData;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AdminAnalyticsDashboard = memo(function AdminAnalyticsDashboard({ data }: AdminAnalyticsDashboardProps) {
  
  const renderKPICards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.kpis.totalEmployees}</div>
          <p className="text-xs text-muted-foreground mt-1">Active on platform</p>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Active Goals</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.kpis.totalGoals}</div>
          <p className="text-xs text-muted-foreground mt-1">Across all departments</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.kpis.approvalRate}%</div>
          <Progress value={data.kpis.approvalRate} className="h-2 mt-2 bg-muted/50" />
        </CardContent>
      </Card>

      <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Org Progress</CardTitle>
          <TrendingUp className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.kpis.averageProgress}%</div>
          <Progress value={data.kpis.averageProgress} className="h-2 mt-2 bg-muted/50" />
        </CardContent>
      </Card>

      <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">At-Risk Goals</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{data.kpis.atRiskGoals}</div>
          <p className="text-xs text-muted-foreground mt-1">Requires intervention</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Goals</CardTitle>
          <Clock className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{data.kpis.overdueGoals}</div>
          <p className="text-xs text-muted-foreground mt-1">Past expected deadline</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Team Completion</CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.kpis.teamCompletionPct}%</div>
          <p className="text-xs text-muted-foreground mt-1">Of employees on track</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Org Health Score</CardTitle>
          <Activity className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">{data.kpis.orgHealthScore} / 100</div>
          <p className="text-xs text-muted-foreground mt-1">Composite indicator</p>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 group bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-900/10 dark:to-background border-indigo-100 dark:border-indigo-900/50 lg:col-start-4 lg:col-span-1 md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Average Performance</CardTitle>
          <Target className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{data.kpis.averagePerformanceScore}</div>
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 uppercase tracking-wider text-[10px]">Weighted</span>
          </div>
          <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">Smart derived KPI score</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Executive Analytics</h2>
        <p className="text-muted-foreground">
          Enterprise intelligence, predictive forecasting, and performance analytics.
        </p>
      </div>

      {renderKPICards()}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-indigo-500" /> Quarterly Performance Trends</CardTitle>
            <CardDescription>Actual vs Expected progression across the annual cycle.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.quarterlyTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="progress" name="Actual Progress" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorProgress)" />
                  <Area type="monotone" dataKey="expected" name="Expected Trajectory" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} fillOpacity={1} fill="url(#colorExpected)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-indigo-500" /> Performance Grade Distribution</CardTitle>
            <CardDescription>Employee evaluations based on weighted score.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.performanceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {data.performanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-500" /> Predictive Risk Overview</CardTitle>
            <CardDescription>Forecasted outcomes based on current velocity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.predictiveRisk} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis dataKey="riskLevel" type="category" className="text-xs font-medium" width={90} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" name="Initiatives" radius={[0, 4, 4, 0]}>
                    {data.predictiveRisk.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-4 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-500" /> Department Performance</CardTitle>
            <CardDescription>Comparing execution average across functional divisions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departmentPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis dataKey="department" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="averageProgress" name="Avg Progress" radius={[4, 4, 0, 0]} barSize={40}>
                    {data.departmentPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.averageProgress >= 80 ? '#10b981' : 
                        entry.averageProgress >= 70 ? '#3b82f6' : 
                        entry.averageProgress >= 50 ? '#f59e0b' : '#ef4444'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Performance AI Insights Panel */}
        <Card className="col-span-1 shadow-sm border-indigo-100 dark:border-indigo-900/50 hover:shadow-md transition-shadow duration-300 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />
          <CardHeader className="bg-indigo-50/30 dark:bg-indigo-900/5 border-b pb-3">
            <CardTitle className="flex items-center justify-between text-indigo-700 dark:text-indigo-400">
              <span className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Performance AI Insights</span>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-indigo-100/50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200">Auto-Generated</Badge>
            </CardTitle>
            <CardDescription>Predictive bottlenecks and productivity recommendations</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1">
              {data.insights.map((insight) => (
                <div key={insight.id} className="flex gap-3 items-start hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors group">
                  <div className={`mt-0.5 p-1.5 rounded-full transition-transform group-hover:scale-110 ${
                    insight.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                    insight.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                    insight.type === 'critical' ? 'bg-red-100 text-red-600' :
                    'bg-indigo-100 text-indigo-600'
                  }`}>
                    {insight.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                    {insight.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                    {insight.type === 'critical' && <AlertOctagon className="h-4 w-4" />}
                    {insight.type === 'info' && <Zap className="h-4 w-4" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts Panel */}
        <Card className="col-span-1 shadow-sm border-red-100 dark:border-red-900/50 hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <CardHeader className="bg-red-50/50 dark:bg-red-900/10 border-b pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <ShieldAlert className="h-5 w-5" /> Critical Alerts
            </CardTitle>
            <CardDescription>Requires immediate intervention</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {data.criticalAlerts.length > 0 ? data.criticalAlerts.map((alert) => (
                <div key={alert.id} className="rounded-md border border-red-200 dark:border-red-900/50 p-3 bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-semibold text-sm text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      {alert.title}
                    </h4>
                    <Badge variant="destructive" className="text-[10px] uppercase group-hover:scale-105 transition-transform">{alert.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
              )) : (
                 <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in-95 duration-500">
                   <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                     <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
                   </div>
                   <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">All Systems Nominal</p>
                   <p className="text-xs text-muted-foreground mt-1">No critical alerts requiring intervention.</p>
                 </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Department Leaderboard & Manager Effectiveness */}
        <Card className="col-span-1 shadow-sm hover:shadow-md transition-shadow duration-300">
          <Tabs defaultValue="leaderboard" className="w-full">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Performance Rankings</CardTitle>
                <TabsList className="h-8 bg-background/50">
                  <TabsTrigger value="leaderboard" className="text-xs">Depts</TabsTrigger>
                  <TabsTrigger value="managers" className="text-xs">Managers</TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent className="pt-0 p-0">
               <TabsContent value="leaderboard" className="m-0 p-0">
                  {data.departmentLeaderboard.map((dept, index) => (
                    <div key={dept.department} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-sm ${
                          index === 0 ? 'bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900 border border-amber-300' :
                          index === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 border border-slate-300' :
                          index === 2 ? 'bg-gradient-to-br from-orange-200 to-orange-400 text-orange-900 border border-orange-300' :
                          'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {dept.rank}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{dept.department}</span>
                          <span className={`text-[10px] font-medium uppercase mt-0.5 ${
                            dept.grade === 'Outstanding' ? 'text-purple-600' :
                            dept.grade === 'Exceeds Expectations' ? 'text-blue-600' :
                            dept.grade === 'Meets Expectations' ? 'text-emerald-600' :
                            'text-amber-600'
                          }`}>{dept.grade}</span>
                        </div>
                      </div>
                      <div className="font-bold text-sm bg-muted/50 px-2 py-0.5 rounded-md">{dept.score} <span className="text-[10px] font-normal text-muted-foreground uppercase">pts</span></div>
                    </div>
                  ))}
               </TabsContent>
               <TabsContent value="managers" className="m-0 p-0">
                  {data.managerEffectiveness.map((mgr) => (
                    <div key={mgr.manager} className="flex flex-col gap-2 p-4 border-b last:border-0 hover:bg-muted/30 transition-colors group">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm group-hover:text-primary transition-colors">{mgr.manager}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono">{mgr.teamProgress}% Avg</Badge>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Team Size: {mgr.teamSize}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Turnaround: {mgr.approvalTimeDays}d</span>
                      </div>
                      <Progress value={mgr.teamProgress} className="h-1.5 mt-0.5 bg-muted/50" />
                    </div>
                  ))}
               </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {/* Approval vs Rejection Trends */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-emerald-500" /> Workflow Governance & Approvals</CardTitle>
            <CardDescription>Volume of goal submissions, approvals, and revision requests over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={data.approvalTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                   <XAxis dataKey="month" className="text-xs" tickLine={false} axisLine={false} />
                   <YAxis className="text-xs" tickLine={false} axisLine={false} />
                   <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                   <Legend />
                   <Line type="monotone" dataKey="approved" name="Approved" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6, strokeWidth: 0 }} />
                   <Line type="monotone" dataKey="rejected" name="Rejected" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 6, strokeWidth: 0 }} />
                   <Line type="monotone" dataKey="revisions" name="Revision Requested" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" activeDot={{ r: 6, strokeWidth: 0 }} />
                 </LineChart>
               </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Team Completion Analytics */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-purple-500" /> Team Completion Analytics</CardTitle>
            <CardDescription>Average completion rate across specialized teams.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data.teamCompletion} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                   <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                   <YAxis dataKey="team" type="category" className="text-xs font-medium" tickLine={false} axisLine={false} />
                   <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                   <Bar dataKey="completion" name="Completion Rate" radius={[0, 4, 4, 0]} barSize={32}>
                    {data.teamCompletion.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.completion >= 85 ? '#8b5cf6' : 
                        entry.completion >= 70 ? '#a78bfa' : 
                        entry.completion >= 50 ? '#c4b5fd' : '#ede9fe'
                      } />
                    ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
