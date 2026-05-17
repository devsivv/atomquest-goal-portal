import { NormalizedGoal, QuarterlyCheckin, QuarterlyGoalUpdate } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock, Activity } from "lucide-react";
import { determineGoalHealth, GoalHealth } from "../../utils/health";

interface TeamCheckinTableProps {
  goals: NormalizedGoal[];
  checkins: QuarterlyCheckin[];
  updates: QuarterlyGoalUpdate[];
  onReviewClick: (goal: NormalizedGoal, checkin: QuarterlyCheckin, update: QuarterlyGoalUpdate | null) => void;
}

export function TeamCheckinTable({ goals, checkins, updates, onReviewClick }: TeamCheckinTableProps) {
  if (goals.length === 0) {
    return (
      <div className="py-12 px-6 text-center border-2 border-dashed rounded-xl bg-muted/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 mb-3">
          <Lock className="h-6 w-6 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No Approved Goals</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          This employee has no approved goals for the current cycle yet. Goals must be locked before tracking can begin.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground border-b">
          <tr>
            <th className="p-3 text-left font-medium">Goal Objective</th>
            <th className="p-3 text-center font-medium w-24">Weight</th>
            <th className="p-3 text-center font-medium w-28">Status</th>
            <th className="p-3 text-center font-medium w-24">Progress</th>
            <th className="p-3 text-center font-medium w-24">Health</th>
            <th className="p-3 text-right font-medium w-32">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {goals.map(goal => {
            const checkin = checkins.find(c => c.goal_id === goal.id);
            const update = checkin ? updates.find(u => u.checkin_id === checkin.id) : null;
            
            const isSubmitted = checkin?.checkin_status === "submitted";
            const isAcknowledged = checkin?.checkin_status === "acknowledged";

            return (
              <tr key={goal.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium">
                  {goal.title}
                  {checkin?.employee_notes && (
                    <div className="text-xs text-muted-foreground truncate max-w-xs mt-1 font-normal">
                      "{checkin.employee_notes}"
                    </div>
                  )}
                </td>
                <td className="p-3 text-center">{goal.weightage}%</td>
                <td className="p-3 text-center">
                  <Badge 
                    variant={isAcknowledged ? "default" : isSubmitted ? "secondary" : "outline"}
                    className={
                      isAcknowledged ? "bg-green-600" : 
                      isSubmitted ? "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400" : ""
                    }
                  >
                    {checkin ? checkin.checkin_status : "Not Started"}
                  </Badge>
                </td>
                <td className="p-3 text-center">
                  {checkin ? <span className="font-bold">{checkin.progress_pct}%</span> : <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">Pending</span>}
                </td>
                <td className="p-3 text-center">
                  {(() => {
                    const health = determineGoalHealth(goal, checkin);
                    if (health === "stalled") return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Stalled</Badge>;
                    if (health === "at_risk") return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 dark:text-amber-400">At Risk</Badge>;
                    if (health === "not_started") return <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">Not Started</span>;
                    if (health === "completed") return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 dark:text-emerald-400">Completed</Badge>;
                    return <Badge variant="outline" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 dark:text-green-400">Healthy</Badge>;
                  })()}
                </td>
                <td className="p-3 text-right">
                  {isSubmitted && (
                    <Button 
                      size="sm" 
                      onClick={() => onReviewClick(goal, checkin, update ?? null)}
                      className="bg-primary text-primary-foreground h-8"
                    >
                      Review
                    </Button>
                  )}
                  {isAcknowledged && (
                    <div className="flex items-center justify-end text-green-600 text-xs font-medium gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Reviewed
                    </div>
                  )}
                  {!isSubmitted && !isAcknowledged && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">Awaiting Submission</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
