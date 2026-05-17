"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle } from "lucide-react";
import { GOAL_LIMITS } from "@/features/goals/schemas";
import type { GoalDraftPayload } from "@/types/goals";

export function GoalTrackerBanner() {
  const { watch, formState } = useFormContext<{ goals: GoalDraftPayload[] }>();
  const goals = watch("goals") || [];
  
  const currentCount = goals.length;
  // Safely coerce weightage strings to numbers for the live sum
  const totalWeightage = goals.reduce(
    (sum, goal) => sum + (Number(goal.weightage) || 0), 
    0
  );

  const isUnderWeightage = totalWeightage < GOAL_LIMITS.TOTAL_WEIGHTAGE_REQ;
  const isOverWeightage = totalWeightage > GOAL_LIMITS.TOTAL_WEIGHTAGE_REQ;
  const isPerfectWeightage = totalWeightage === GOAL_LIMITS.TOTAL_WEIGHTAGE_REQ;
  
  const weightageMessage = isUnderWeightage 
    ? `${GOAL_LIMITS.TOTAL_WEIGHTAGE_REQ - totalWeightage}% remaining`
    : isOverWeightage 
    ? `${totalWeightage - GOAL_LIMITS.TOTAL_WEIGHTAGE_REQ}% over limit`
    : "Ready for submission";

  const progressColor = isUnderWeightage 
    ? "[&>div]:bg-yellow-500" 
    : isOverWeightage 
    ? "[&>div]:bg-destructive" 
    : "[&>div]:bg-green-500";

  // RHF surfaces root array errors here
  const hasRootError = formState.errors.goals?.root?.message;

  return (
    <Card className="sticky top-4 z-10 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b-4 border-b-primary/20 transition-all duration-300 hover:shadow-md">
      <CardContent className="flex flex-col items-center justify-between gap-4 p-4 md:flex-row">
        
        {/* Count Tracker */}
        <div className="flex items-center gap-3">
          <Badge variant={currentCount > GOAL_LIMITS.MAX_GOALS_PER_EMPLOYEE ? "destructive" : "secondary"}>
            {currentCount} / {GOAL_LIMITS.MAX_GOALS_PER_EMPLOYEE} Goals
          </Badge>
          <span className="text-sm font-medium text-muted-foreground">
            {currentCount === 0 ? "Add a goal to begin" : "Active goals"}
          </span>
        </div>

        {/* Weightage Tracker */}
        <div className="w-full flex-1 space-y-2 max-w-md">
          <div className="flex justify-between text-sm font-medium">
            <span className={isOverWeightage ? "text-destructive" : isUnderWeightage ? "text-yellow-600 dark:text-yellow-500" : "text-emerald-600 dark:text-emerald-500"}>
              Total Weightage: {totalWeightage}%
            </span>
            <span className="text-muted-foreground">{weightageMessage}</span>
          </div>
          <Progress 
            value={Math.min((totalWeightage / GOAL_LIMITS.TOTAL_WEIGHTAGE_REQ) * 100, 100)} 
            className={`h-2 ${progressColor}`}
          />
        </div>

        {/* Status Indicators */}
        {isOverWeightage && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Over weightage limit</span>
          </div>
        )}
        
        {isPerfectWeightage && currentCount > 0 && !hasRootError && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-600 dark:bg-green-500/10 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>Ready for submission</span>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
