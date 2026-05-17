import { QuarterlyGoalState } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

export function PlannedVsActualTable({ goals }: { goals: QuarterlyGoalState[] }) {
  return (
    <div className="rounded-md border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b text-muted-foreground">
            <tr>
              <th className="p-4 text-left font-medium">Goal Objective</th>
              <th className="p-4 text-center font-medium w-24">Weightage</th>
              <th className="p-4 text-center font-medium w-32">Status</th>
              <th className="p-4 text-center font-medium w-32">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {goals.map(g => (
              <tr key={g.goalId} className="hover:bg-muted/30 transition-colors">
                <td className="p-4 font-medium">{g.title}</td>
                <td className="p-4 text-center">{g.weightage}%</td>
                <td className="p-4 text-center">
                  <Badge 
                    variant={
                      g.checkin?.checkin_status === 'acknowledged' ? 'default' : 
                      g.checkin?.checkin_status === 'submitted' ? 'secondary' : 'outline'
                    }
                    className={g.checkin?.checkin_status === 'acknowledged' ? "bg-green-600" : ""}
                  >
                    {g.checkin ? g.checkin.checkin_status : "Not Started"}
                  </Badge>
                </td>
                <td className="p-4 text-center">
                  {g.checkin ? (
                    <span className="font-semibold">{g.checkin.progress_pct}%</span>
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">Pending</span>
                  )}
                </td>
              </tr>
            ))}
            {goals.length === 0 && (
              <tr>
                <td colSpan={4} className="p-12 text-center text-muted-foreground bg-muted/10">
                  <div className="flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-500">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Target className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="font-medium">No tracking data available.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
