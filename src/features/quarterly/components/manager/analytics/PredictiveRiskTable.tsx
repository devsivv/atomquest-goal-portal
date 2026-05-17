import { useMemo } from "react";
import { NormalizedGoal, QuarterlyCheckin } from "@/types";
import { predictGoalCompletion, GoalForecast, DeliveryConfidence, ForecastRisk } from "../../../utils/forecast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, Clock, TrendingUp, CheckCircle2, AlertOctagon } from "lucide-react";

interface PredictiveRiskTableProps {
  goals: NormalizedGoal[];
  checkins: QuarterlyCheckin[];
  profilesMap: Record<string, string>;
}

export function PredictiveRiskTable({ goals, checkins, profilesMap }: PredictiveRiskTableProps) {
  // Memoize deterministic risk analysis
  const tableData = useMemo(() => {
    return goals.map(goal => {
      const goalCheckins = checkins.filter(c => c.goal_id === goal.id);
      goalCheckins.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const latestCheckin = goalCheckins.length > 0 ? goalCheckins[goalCheckins.length - 1] : null;
      
      const forecast = predictGoalCompletion(goal, checkins);
      
      return {
        goal,
        employeeName: profilesMap[goal.profile_id] || "Unknown",
        currentProgress: latestCheckin ? latestCheckin.progress_pct : 0,
        forecast
      };
    }).sort((a, b) => {
      // Sort Critical Risk to top, then Likely Delayed, then Confidence Low, etc.
      const riskScore: Record<ForecastRisk, number> = {
        "Critical Risk": 4,
        "Likely Delayed": 3,
        "On Track": 2,
        "Likely To Exceed": 1
      };
      
      const diff = riskScore[b.forecast.risk] - riskScore[a.forecast.risk];
      if (diff !== 0) return diff;
      return a.forecast.estimatedFinalProgress - b.forecast.estimatedFinalProgress; // lower estimated progress goes first within same tier
    });
  }, [goals, checkins, profilesMap]);

  if (tableData.length === 0) return null;

  const getRiskBadge = (risk: ForecastRisk) => {
    switch (risk) {
      case "Critical Risk": return <Badge variant="destructive" className="flex gap-1 items-center"><AlertOctagon className="w-3 h-3"/> Critical</Badge>;
      case "Likely Delayed": return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 border-transparent flex gap-1 items-center"><AlertTriangle className="w-3 h-3"/> Delayed</Badge>;
      case "Likely To Exceed": return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 border-transparent flex gap-1 items-center"><TrendingUp className="w-3 h-3"/> Exceeding</Badge>;
      case "On Track": return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 border-transparent flex gap-1 items-center"><CheckCircle2 className="w-3 h-3"/> On Track</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: DeliveryConfidence) => {
    switch (confidence) {
      case "High": return <span className="text-emerald-600 dark:text-emerald-400 font-medium">High</span>;
      case "Medium": return <span className="text-amber-600 dark:text-amber-400 font-medium">Medium</span>;
      case "Low": return <span className="text-red-600 dark:text-red-400 font-medium">Low</span>;
    }
  };

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-500" />
          Predictive Risk & Delivery Matrix
        </CardTitle>
        <CardDescription>
          Deterministic execution forecasts based on current velocity and momentum.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold border-b">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Employee</th>
                <th className="px-4 py-3 min-w-[200px]">Goal</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Current %</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Forecasted %</th>
                <th className="px-4 py-3 whitespace-nowrap">Confidence</th>
                <th className="px-4 py-3 whitespace-nowrap">Predicted Risk</th>
                <th className="px-4 py-3 min-w-[250px]">Recommended Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tableData.slice(0, 10).map((row) => (
                <tr key={row.goal.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.employeeName}</td>
                  <td className="px-4 py-3 truncate max-w-[250px]" title={row.goal.title}>{row.goal.title}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.currentProgress}%</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {row.forecast.estimatedFinalProgress}%
                  </td>
                  <td className="px-4 py-3">{getConfidenceBadge(row.forecast.confidence)}</td>
                  <td className="px-4 py-3">{getRiskBadge(row.forecast.risk)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground italic">
                    {row.forecast.recommendedIntervention}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tableData.length > 10 && (
            <div className="text-center py-2 bg-muted/20 border-t text-xs text-muted-foreground">
              Showing top 10 highest-risk initiatives.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
