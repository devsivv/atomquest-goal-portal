"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";

const data = [
  { quarter: "Q1", completion: 65, target: 70 },
  { quarter: "Q2", completion: 78, target: 75 },
  { quarter: "Q3", completion: 86, target: 80 },
  { quarter: "Q4", completion: 94, target: 90 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border/50 bg-popover/95 p-3 shadow-xl backdrop-blur-md supports-[backdrop-filter]:bg-popover/60 text-popover-foreground">
        <p className="font-medium text-sm mb-2 text-foreground">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span 
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-border/50" 
                  style={{ background: entry.color }} 
                />
                {entry.name}
              </span>
              <span className="font-medium text-foreground">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function QuarterlyTrendChart() {
  return (
    <Card className="col-span-full lg:col-span-4 shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:border-primary/20">
      <CardHeader>
        <CardTitle>Quarterly Goal Completion Trend</CardTitle>
        <CardDescription>Historical completion rates vs target expectations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: -20 }}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" opacity={0.6} />
              <XAxis 
                dataKey="quarter" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }} 
                className="text-muted-foreground"
                dy={10}
              />
              <YAxis 
                tickFormatter={(val) => `${val}%`} 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }} 
                className="text-muted-foreground"
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ stroke: 'oklch(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.2 }}
              />
              <Area 
                type="monotone" 
                dataKey="completion" 
                name="Actual" 
                stroke="#3b82f6" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorActual)"
                dot={{ r: 4, strokeWidth: 2, fill: "oklch(var(--background))", stroke: "#3b82f6" }}
                activeDot={{ r: 6, strokeWidth: 3, fill: "#3b82f6", stroke: "oklch(var(--background))" }} 
                animationDuration={1500}
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                name="Target" 
                stroke="oklch(var(--muted-foreground))" 
                strokeOpacity={0.6}
                strokeWidth={2} 
                strokeDasharray="4 4" 
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "oklch(var(--muted-foreground))" }}
                animationDuration={1500}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
