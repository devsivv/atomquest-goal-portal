import { AnalyticsKpiCard } from "./AnalyticsKpiCard";
import { QuarterlyTrendChart } from "./QuarterlyTrendChart";
import { CompletionHeatmap } from "./CompletionHeatmap";
import { ManagerEffectivenessCard } from "./ManagerEffectivenessCard";
import { Target, TrendingUp, Users, CheckCircle } from "lucide-react";

export function ExecutiveSummaryPanel() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      <div className="flex flex-col gap-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Overview</h2>
        <p className="text-muted-foreground">
          Executive summary of team performance, goal completion trends, and review effectiveness.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnalyticsKpiCard 
          title="Overall Goal Completion" 
          value="84%" 
          trend={12} 
          trendLabel="vs last quarter"
          icon={<Target className="h-5 w-5" />}
          className="border-l-4 border-l-primary"
        />
        <AnalyticsKpiCard 
          title="Team Velocity" 
          value="High" 
          trend={5}
          trendLabel="momentum"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <AnalyticsKpiCard 
          title="Active Goals Tracking" 
          value="42" 
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <AnalyticsKpiCard 
          title="Team Engagement" 
          value="98%" 
          trend={2}
          trendLabel="check-in rate"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 pt-4">
        <QuarterlyTrendChart />
        <CompletionHeatmap />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 pt-4">
        <ManagerEffectivenessCard />
        
        {/* Placeholder for future expansion or additional insights */}
        <div className="col-span-full lg:col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-center items-center p-8 text-center bg-gradient-to-br from-muted/50 to-muted/20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">AI Performance Insights</h3>
          <p className="text-muted-foreground max-w-md text-sm">
            Coming soon. The system is gathering more quarterly tracking data to provide predictive analysis on goal completion probabilities.
          </p>
        </div>
      </div>
    </div>
  );
}
