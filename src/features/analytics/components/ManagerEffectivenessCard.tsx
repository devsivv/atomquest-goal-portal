import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, Zap } from "lucide-react";

export function ManagerEffectivenessCard() {
  return (
    <Card className="col-span-full lg:col-span-3 shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:border-primary/20 h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manager Effectiveness</CardTitle>
            <CardDescription className="mt-1">Review velocity and engagement metrics</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Zap className="w-3 h-3 mr-1" /> Top Tier
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 flex-1">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 font-medium text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Review Turnaround Time</span>
            </div>
            <span className="font-bold text-lg">1.2 Days</span>
          </div>
          <Progress value={85} className="h-2 transition-all duration-1000 ease-out" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Faster than 85% of managers</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Excellent</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 font-medium text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>Feedback Richness</span>
            </div>
            <span className="font-bold text-lg">92%</span>
          </div>
          <Progress value={92} className="h-2 bg-muted [&>div]:bg-violet-500 transition-all duration-1000 ease-out" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Check-ins with constructive comments</span>
            <span className="text-violet-600 dark:text-violet-400 font-medium">Outstanding</span>
          </div>
        </div>
        
        <div className="pt-4 border-t mt-auto">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your team shows <strong className="text-foreground">high engagement</strong> with goal tracking. Continuous feedback loops are actively contributing to increased quarterly velocity.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
