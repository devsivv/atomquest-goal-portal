import { NormalizedGoal, QuarterlyCheckin } from "@/types";

export type PerformanceGrade = "Outstanding" | "Exceeds Expectations" | "Meets Expectations" | "Needs Improvement";

export interface EmployeeScore {
  employeeId: string;
  name: string;
  score: number;
  grade: PerformanceGrade;
}

export function calculateEmployeeScore(
  goals: NormalizedGoal[],
  checkins: QuarterlyCheckin[],
  employeeId: string,
  employeeName: string
): EmployeeScore {
  const employeeGoals = goals.filter(g => g.profile_id === employeeId);
  
  if (employeeGoals.length === 0) {
    return { employeeId, name: employeeName, score: 0, grade: "Needs Improvement" };
  }

  let totalWeightedProgress = 0;
  let totalWeightage = 0;

  employeeGoals.forEach(goal => {
    // Find latest checkin
    const goalCheckins = checkins.filter(c => c.goal_id === goal.id);
    goalCheckins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestCheckin = goalCheckins[0];
    
    const progress = latestCheckin ? latestCheckin.progress_pct : 0;
    const weight = goal.weightage || 0;

    totalWeightedProgress += (progress * weight);
    totalWeightage += weight;
  });

  // Calculate weighted average (normally out of 100 weightage)
  // If weightage is incomplete, we calculate percentage relative to 100
  const score = Math.round(totalWeightedProgress / 100);

  return {
    employeeId,
    name: employeeName,
    score,
    grade: determineGrade(score)
  };
}

export function determineGrade(score: number): PerformanceGrade {
  if (score >= 90) return "Outstanding";
  if (score >= 75) return "Exceeds Expectations";
  if (score >= 50) return "Meets Expectations";
  return "Needs Improvement";
}

export function generatePerformanceDistribution(scores: EmployeeScore[]) {
  let outstanding = 0;
  let exceeds = 0;
  let meets = 0;
  let needsImprovement = 0;

  scores.forEach(s => {
    if (s.grade === "Outstanding") outstanding++;
    else if (s.grade === "Exceeds Expectations") exceeds++;
    else if (s.grade === "Meets Expectations") meets++;
    else needsImprovement++;
  });

  return [
    { grade: "Outstanding", count: outstanding, fill: "#8b5cf6" },
    { grade: "Exceeds Expectations", count: exceeds, fill: "#3b82f6" },
    { grade: "Meets Expectations", count: meets, fill: "#10b981" },
    { grade: "Needs Improvement", count: needsImprovement, fill: "#f59e0b" },
  ];
}
