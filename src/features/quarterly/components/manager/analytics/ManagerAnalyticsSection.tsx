"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, TrendingUp, Activity, BarChart3, PieChart as PieChartIcon, AlertTriangle, AlertOctagon, CheckCircle2, Info, Lightbulb, ArrowRight } from "lucide-react";
import { useManagerAnalytics } from "../../../hooks/useManagerAnalytics";
import { InsightSeverity, ManagerInsight } from "../../../utils/insights";
import { ManagerAlert } from "../../../utils/alerts";
import { predictGoalCompletion } from "../../../utils/forecast";
import { PredictiveRiskTable } from "./PredictiveRiskTable";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, AreaChart, Area
} from "recharts";

export function ManagerAnalyticsSection({ managerId, cycleId }: { managerId: string; cycleId: string }) {
  // We use a custom hook to centralize data fetching across all quarters.
  // This avoids muddying the active-quarter-only state of ManagerQuarterlyDashboard.
  const { data, isLoading, error } = useManagerAnalytics(managerId, cycleId);

  // Memoize chart data configurations to prevent unnecessary Recharts re-renders
  // Note: 'data' is already a stable object coming from useManagerAnalytics unless it updates.
  const isDataEmpty = useMemo(() => {
    if (!data) return true;
    return data.healthDistribution.length === 0 && data.teamCompletion.length === 0;
  }, [data]);

  // Derived Recommendations
  const recommendations: string[] = useMemo(() => {
    if (!data) return [];
    const recs: string[] = [];
    const hasStalled = data.alerts.some(a => a.type === "stalled");
    const hasOverdue = data.alerts.some(a => a.type === "overdue");
    const weakStrategy = data.insights.find(i => i.category === "strategy" && i.severity === "critical");
    const lowMomentum = data.insights.find(i => i.category === "team" && i.severity === "warning");
    const strongMomentum = data.insights.find(i => i.category === "team" && i.severity === "success");

    if (hasStalled) recs.push("Schedule an immediate unblocker sync for stalled goals.");
    if (hasOverdue) recs.push("Escalate overdue goals and re-negotiate deadlines if necessary.");
    if (weakStrategy) recs.push(`Re-align execution priorities to address weaknesses in: ${weakStrategy.title.replace('Strategic Vulnerability: ', '')}`);
    if (lowMomentum) recs.push(`Consider a 1-on-1 performance alignment for lagging team members.`);
    if (strongMomentum && recs.length < 3) recs.push(`Acknowledge and reward top performers driving execution velocity.`);
    
    // Fill with a generic if everything is perfect
    if (recs.length === 0) recs.push("Maintain current execution cadence; team is performing optimally.");
    return recs.slice(0, 3);
  }, [data?.alerts, data?.insights]);

  const predictiveStats = useMemo(() => {
    if (!data) return null;
    let highRiskCount = 0;
    let delayedCount = 0;
    
    let highConf = 0;
    let medConf = 0;
    let lowConf = 0;

    data.rawGoals.forEach(g => {
       const forecast = predictGoalCompletion(g, data.rawCheckins);
       if (forecast.risk === "Critical Risk") highRiskCount++;
       if (forecast.risk === "Likely Delayed") delayedCount++;
       
       if (forecast.confidence === "High") highConf++;
       if (forecast.confidence === "Medium") medConf++;
       if (forecast.confidence === "Low") lowConf++;
    });

    const forecastedCompletionRate = data.rawGoals.length > 0 
      ? Math.round(data.rawGoals.reduce((sum, g) => sum + predictGoalCompletion(g, data.rawCheckins).estimatedFinalProgress, 0) / data.rawGoals.length)
      : 0;

    const confidenceDistribution = [
      { name: "High Confidence", value: highConf, fill: "#10b981" },
      { name: "Medium Confidence", value: medConf, fill: "#f59e0b" },
      { name: "Low Confidence", value: lowConf, fill: "#ef4444" },
    ].filter(d => d.value > 0);

    const topPerformer = data.insights.find(i => i.id.startsWith("insight-top-momentum-"));
    const lowPerformer = data.insights.find(i => i.id.startsWith("insight-low-momentum-"));

    return {
      highRiskCount,
      delayedCount,
      forecastedCompletionRate,
      confidenceDistribution,
      topPerformer,
      lowPerformer
    };
  }, [data?.rawGoals, data?.rawCheckins]);

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border rounded-xl bg-card/50">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Loading execution analytics...</p>
      </div>
    );
  }

  if (error || isDataEmpty || !data) {
    return null; // Fail gracefully or show a tiny error message
  }

  // Take top 3 insights for the row
  const topInsights = data.insights.slice(0, 3);

  const getSeverityColor = (severity: InsightSeverity) => {
    switch (severity) {
      case "critical": return "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20";
      case "warning": return "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20";
      case "success": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20";
      default: return "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20";
    }
  };

  const getSeverityIcon = (severity: InsightSeverity) => {
    switch (severity) {
      case "critical": return <AlertOctagon className="h-4 w-4" />;
      case "warning": return <AlertTriangle className="h-4 w-4" />;
      case "success": return <CheckCircle2 className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* 1. INSIGHT CARDS ROW */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="text-xl font-bold tracking-tight">Executive Intelligence</h3>
        </div>
        
        {topInsights.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
            {topInsights.map(insight => (
              <Card key={insight.id} className={`shadow-sm border transition-all hover:shadow-md ${getSeverityColor(insight.severity)} bg-opacity-50 dark:bg-opacity-5`}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 leading-tight">
                      {getSeverityIcon(insight.severity)}
                      {insight.title}
                    </CardTitle>
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-70 border border-current rounded px-1.5 py-0.5">
                      {insight.category}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm font-medium opacity-90 leading-snug">
                    {insight.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No active insights generated at this time.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHARTS SECTION (Takes up 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold tracking-tight">Execution Analytics</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 
          A. Health Distribution (Pie/Donut) 
          Visualization Intent: Provide a high-level summary of goal trajectories (Healthy vs At Risk vs Stalled).
          This helps executives immediately identify the aggregate risk level of the team.
        */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <PieChartIcon className="h-4 w-4" />
              Goal Health Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Current breakdown of team goal trajectories
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] md:h-[320px] pt-4">
            {data.healthDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.healthDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.healthDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 
          B. Quarterly Progress Trends (Line) 
          Visualization Intent: Show velocity of progress over the year. 
          By plotting average progress across Q1->Q4, managers can spot execution slumps.
        */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Quarterly Progress Trends
            </CardTitle>
            <CardDescription className="text-xs">
              Average team progress velocity across quarters
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] md:h-[320px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.quarterlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="averageProgress" 
                  name="Avg Progress %"
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                  activeDot={{ r: 6, fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 
          C. Goal Category Performance (Bar) 
          Visualization Intent: Break down execution success by strategic 'Thrust Area' (Internal Process, Financial, etc.).
          Highlights where the team excels and where strategic pillars are lagging.
        */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Category Performance
            </CardTitle>
            <CardDescription className="text-xs">
              Average progress by thrust area
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] md:h-[320px] pt-4">
            {data.categoryPerformance.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="averageProgress" name="Avg Progress %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 
          D. Team Completion Analytics (Horizontal Bar) 
          Visualization Intent: Rank team members by their average goal completion.
          Horizontal layout is chosen specifically to comfortably fit full employee names on the Y-axis.
        */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              Team Completion Analytics
            </CardTitle>
            <CardDescription className="text-xs">
              Average goal completion percentage per employee
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] md:h-[320px] pt-4">
            {data.teamCompletion.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={data.teamCompletion} 
                  layout="vertical" 
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <YAxis type="category" dataKey="employeeName" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={80} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="averageProgress" name="Completion %" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

        {/* ALERTS & RECOMMENDATIONS SECTION (Takes up 1 column) */}
        <div className="space-y-6">
          {/* 2. CRITICAL ALERTS PANEL */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-500" />
                <h3 className="text-xl font-bold tracking-tight">Critical Alerts</h3>
              </div>
              {data.alerts.length > 0 && (
                <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {data.alerts.length} Active
                </span>
              )}
            </div>

            {data.alerts.length === 0 ? (
              <div className="p-6 border border-dashed rounded-xl bg-muted/20 text-center flex flex-col items-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-50" />
                <p className="text-sm font-medium text-muted-foreground">No critical alerts.</p>
                <p className="text-xs text-muted-foreground/70">Execution is on track.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {data.alerts.map(alert => (
                  <div key={alert.id} className="p-3 rounded-lg border bg-card shadow-sm flex items-start gap-3 border-l-4 border-l-red-500">
                    <AlertTriangle className={`h-5 w-5 shrink-0 ${alert.severity === 'urgent' ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold leading-none">{alert.title}</h4>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. EXECUTIVE RECOMMENDATIONS */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b pb-2">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold tracking-tight">Recommended Actions</h3>
            </div>
            <Card className="bg-primary/5 border-primary/20 shadow-sm">
              <CardContent className="p-4 space-y-3">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-foreground/90 leading-snug">{rec}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      {/* 4. PREDICTIVE INTELLIGENCE */}
      <div className="space-y-6 pt-4 border-t">
        <div className="flex items-center gap-2 border-b pb-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          <h3 className="text-xl font-bold tracking-tight">Predictive Intelligence</h3>
        </div>
        
        {/* Predictive Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="shadow-sm border-emerald-200 bg-emerald-50/50 dark:bg-emerald-500/5 dark:border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">Forecasted Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{predictiveStats?.forecastedCompletionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">Based on current trajectory</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-red-200 bg-red-50/50 dark:bg-red-500/5 dark:border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">High Risk Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{predictiveStats?.highRiskCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Stalled or critically off-track</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-amber-200 bg-amber-50/50 dark:bg-amber-500/5 dark:border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">Predicted Delays</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{predictiveStats?.delayedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Tracking to miss deadlines</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-indigo-200 bg-indigo-50/50 dark:bg-indigo-500/5 dark:border-indigo-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">Momentum Leader</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 truncate mt-1">
                {predictiveStats?.topPerformer ? predictiveStats.topPerformer.description.split(" ")[0] : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Highest acceleration</p>
            </CardContent>
          </Card>
        </div>

        {/* Predictive Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <PieChartIcon className="h-4 w-4" />
                Delivery Confidence Distribution
              </CardTitle>
              <CardDescription className="text-xs">Predictability based on check-in consistency</CardDescription>
            </CardHeader>
            <CardContent className="h-[260px] md:h-[320px] pt-4">
              {predictiveStats?.confidenceDistribution.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={predictiveStats?.confidenceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {predictiveStats?.confidenceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Momentum & Trajectory
              </CardTitle>
              <CardDescription className="text-xs">Aggregated team execution velocity over quarters</CardDescription>
            </CardHeader>
            <CardContent className="h-[260px] md:h-[320px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.quarterlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="averageProgress" name="Forecasted Trajectory" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAvg)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. PREDICTIVE RISK TABLE */}
      {data.rawGoals && data.rawGoals.length > 0 && (
        <PredictiveRiskTable 
          goals={data.rawGoals} 
          checkins={data.rawCheckins} 
          profilesMap={data.rawProfilesMap} 
        />
      )}
    </div>
  );
}
