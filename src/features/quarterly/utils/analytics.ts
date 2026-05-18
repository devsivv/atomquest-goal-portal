import { NormalizedGoal, QuarterlyCheckin } from "@/types";
import { determineGoalHealth } from "./health";
import { generateManagerInsights, ManagerInsight } from "./insights";
import { generateManagerAlerts, ManagerAlert } from "./alerts";
import { calculateEmployeeScore, generatePerformanceDistribution, EmployeeScore } from "./scoring";

export interface AnalyticsData {
  healthDistribution: { name: string; value: number; fill: string }[];
  categoryPerformance: { category: string; averageProgress: number }[];
  teamCompletion: { employeeName: string; averageProgress: number; score: number; grade: string }[];
  quarterlyTrends: { quarter: string; averageProgress: number }[];
  performanceDistribution: { grade: string; count: number; fill: string }[];
  averageScore: number;
  insights: ManagerInsight[];
  alerts: ManagerAlert[];
  rawGoals: NormalizedGoal[];
  rawCheckins: QuarterlyCheckin[];
  rawProfilesMap: Record<string, string>;
}

export function generateManagerAnalytics(
  goals: NormalizedGoal[],
  checkins: QuarterlyCheckin[],
  profilesMap: Record<string, string> // employeeId -> name
): AnalyticsData {
  
  // 1. Health Distribution
  // Aggregation Logic: For each approved goal, we find its most recently updated check-in
  // and run it through the centralized 'determineGoalHealth' utility. We then group counts
  // by health status to generate a holistic view of team execution risk.
  let healthy = 0;
  let atRisk = 0;
  let stalled = 0;
  let completed = 0;

  const goalsMap = new Map<string, NormalizedGoal>();
  goals.forEach(g => goalsMap.set(g.id, g));

  goals.forEach(goal => {
    // find latest checkin for this goal
    const goalCheckins = checkins.filter(c => c.goal_id === goal.id);
    goalCheckins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestCheckin = goalCheckins[0] || null;

    const health = determineGoalHealth(goal, latestCheckin);
    if (health === "healthy") healthy++;
    else if (health === "at_risk") atRisk++;
    else if (health === "stalled") stalled++;
    else if (health === "completed") completed++;
  });

  const healthDistribution = [
    { name: "Healthy", value: healthy, fill: "#10b981" }, // emerald-500
    { name: "At Risk", value: atRisk, fill: "#f59e0b" },  // amber-500
    { name: "Stalled", value: stalled, fill: "#ef4444" }, // red-500
    { name: "Completed", value: completed, fill: "#6366f1" } // indigo-500
  ].filter(d => d.value > 0);

  // 2. Category Performance (Average progress by thrust_area)
  // Aggregation Logic: Groups all goals by their strategic "Thrust Area" (e.g., Financial, Customer).
  // Averages the latest check-in progress percentage within each category to identify strategic pillars
  // that are underperforming across the team.
  const categoryMap: Record<string, { totalProgress: number; count: number }> = {};
  goals.forEach(goal => {
    const goalCheckins = checkins.filter(c => c.goal_id === goal.id);
    goalCheckins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestCheckin = goalCheckins[0];
    const progress = latestCheckin ? latestCheckin.progress_pct : 0;
    
    const cat = goal.thrust_area || "Other";
    if (!categoryMap[cat]) categoryMap[cat] = { totalProgress: 0, count: 0 };
    categoryMap[cat].totalProgress += progress;
    categoryMap[cat].count++;
  });

  const categoryPerformance = Object.keys(categoryMap).map(cat => ({
    category: cat,
    averageProgress: Math.round(categoryMap[cat].totalProgress / categoryMap[cat].count)
  }));

  // 3. Team Completion Analytics (Average progress per employee)
  // Aggregation Logic: Maps each goal's progress to its respective owner (employee_id).
  // Averages the progress across all goals for each employee to create an individual completion rank.
  const employeeMap: Record<string, { totalProgress: number; count: number }> = {};
  goals.forEach(goal => {
    const empId = goal.profile_id;
    const goalCheckins = checkins.filter(c => c.goal_id === goal.id);
    goalCheckins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestCheckin = goalCheckins[0];
    const progress = latestCheckin ? latestCheckin.progress_pct : 0;

    if (!employeeMap[empId]) employeeMap[empId] = { totalProgress: 0, count: 0 };
    employeeMap[empId].totalProgress += progress;
    employeeMap[empId].count++;
  });

  const employeeScores: EmployeeScore[] = [];

  const teamCompletion = Object.keys(employeeMap).map(empId => {
    const scoreData = calculateEmployeeScore(goals, checkins, empId, profilesMap[empId] || "Unknown");
    employeeScores.push(scoreData);
    
    return {
      employeeName: profilesMap[empId] || "Unknown",
      averageProgress: Math.round(employeeMap[empId].totalProgress / employeeMap[empId].count),
      score: scoreData.score,
      grade: scoreData.grade
    };
  }).sort((a, b) => b.score - a.score);

  const performanceDistribution = generatePerformanceDistribution(employeeScores);
  const averageScore = employeeScores.length > 0 
    ? Math.round(employeeScores.reduce((acc, curr) => acc + curr.score, 0) / employeeScores.length)
    : 0;

  // 4. Quarterly Progress Trends
  // Aggregation Logic: Loops through all historical check-ins across all quarters (Q1, Q2, Q3, Q4).
  // Calculates the mean progress percentage reported in each distinct quarter to plot the team's
  // velocity and trajectory over the annual cycle.
  const quarterlyMap: Record<string, { totalProgress: number; count: number }> = {};
  // Aggregate checkins by quarter
  // Wait, if a goal doesn't have a checkin in Q1, it's 0. If we just average existing checkins:
  checkins.forEach(c => {
    if (!quarterlyMap[c.quarter]) quarterlyMap[c.quarter] = { totalProgress: 0, count: 0 };
    quarterlyMap[c.quarter].totalProgress += c.progress_pct;
    quarterlyMap[c.quarter].count++;
  });

  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const quarterlyTrends = quarters.map(q => {
    if (quarterlyMap[q] && quarterlyMap[q].count > 0) {
      return { quarter: q, averageProgress: Math.round(quarterlyMap[q].totalProgress / quarterlyMap[q].count) };
    }
    return { quarter: q, averageProgress: 0 };
  });

  const insights = generateManagerInsights(goals, checkins, profilesMap);
  const alerts = generateManagerAlerts(goals, checkins);

  return {
    healthDistribution,
    categoryPerformance,
    teamCompletion,
    quarterlyTrends,
    performanceDistribution,
    averageScore,
    insights,
    alerts,
    rawGoals: goals,
    rawCheckins: checkins,
    rawProfilesMap: profilesMap
  };
}
