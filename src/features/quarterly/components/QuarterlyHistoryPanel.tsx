import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuarterLabel, QuarterlyCheckin } from "@/types";
import { format } from "date-fns";
import { History } from "lucide-react";

interface QuarterlyHistoryPanelProps {
  checkins: QuarterlyCheckin[];
}

export function QuarterlyHistoryPanel({ checkins }: QuarterlyHistoryPanelProps) {
  if (checkins.length === 0) {
    return (
      <Card className="border-dashed bg-muted/10">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-500">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <History className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No History Available</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
            Your quarterly updates will appear here once submitted.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by quarter
  const grouped = checkins.reduce((acc, checkin) => {
    if (!acc[checkin.quarter]) {
      acc[checkin.quarter] = [];
    }
    acc[checkin.quarter].push(checkin);
    return acc;
  }, {} as Record<QuarterLabel, QuarterlyCheckin[]>);

  const quarters: QuarterLabel[] = ["Q4", "Q3", "Q2", "Q1"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-in History</CardTitle>
        <CardDescription>Review your past quarterly updates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {quarters.map((q) => {
          const qCheckins = grouped[q];
          if (!qCheckins || qCheckins.length === 0) return null;

          return (
            <div key={q} className="border-b pb-4 last:border-0 last:pb-0">
              <h4 className="font-semibold text-lg mb-3">{q} Updates</h4>
              <div className="space-y-3">
                {qCheckins.map((c) => (
                  <div key={c.id} className="text-sm bg-muted/40 p-3 rounded-md flex justify-between items-start">
                    <div>
                      <p className="font-medium">Progress: {c.progress_pct}%</p>
                      {c.employee_notes && (
                        <p className="text-muted-foreground mt-1 text-xs italic">
                          "{c.employee_notes}"
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        c.checkin_status === 'acknowledged' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        c.checkin_status === 'submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {c.checkin_status}
                      </span>
                      <div className="text-[10px] text-muted-foreground mt-2">
                        {format(new Date(c.updated_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
