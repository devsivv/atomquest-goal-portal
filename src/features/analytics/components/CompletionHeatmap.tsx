"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HeatmapData {
  employeeName: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

const data: HeatmapData[] = [
  { employeeName: "Alice Smith", q1: 100, q2: 85, q3: 90, q4: 95 },
  { employeeName: "Bob Johnson", q1: 75, q2: 80, q3: 0, q4: 0 },
  { employeeName: "Charlie Lee", q1: 90, q2: 100, q3: 100, q4: 85 },
  { employeeName: "Diana Prince", q1: 60, q2: 70, q3: 80, q4: 90 },
  { employeeName: "Evan Wright", q1: 100, q2: 100, q3: 100, q4: 100 },
];

function getColor(val: number) {
  if (val === 0) return "bg-muted";
  if (val < 50) return "bg-rose-500/80";
  if (val < 80) return "bg-amber-400/80";
  return "bg-emerald-500/80";
}

export function CompletionHeatmap() {
  return (
    <Card className="col-span-full lg:col-span-3 shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:border-primary/20">
      <CardHeader>
        <CardTitle>Team Velocity Heatmap</CardTitle>
        <CardDescription>Individual quarter-by-quarter progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground text-center mb-4 uppercase tracking-wider">
            <div className="text-left pl-2">Employee</div>
            <div>Q1</div>
            <div>Q2</div>
            <div>Q3</div>
            <div>Q4</div>
          </div>
          
          <div className="space-y-2">
            {data.map((row, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-center group">
                <div className="text-sm font-medium truncate pr-2 pl-2 text-muted-foreground group-hover:text-foreground transition-colors">
                  {row.employeeName}
                </div>
                {[row.q1, row.q2, row.q3, row.q4].map((val, qIdx) => (
                  <div 
                    key={qIdx} 
                    title={val === 0 ? "No Data" : `${val}% Progress`}
                    className={`h-8 rounded-md transition-all duration-300 hover:ring-2 ring-ring ring-offset-1 ring-offset-background cursor-crosshair scale-100 hover:scale-105 ${getColor(val)}`} 
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 pt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted"></div> None</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-rose-500/80"></div> &lt;50%</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400/80"></div> 50-80%</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500/80"></div> 80%+</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
