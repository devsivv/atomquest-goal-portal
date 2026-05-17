import { NormalizedGoal, QuarterlyCheckin } from "@/types";
import { determineGoalHealth } from "./health";
import { predictGoalCompletion } from "./forecast";
import { detectMomentumShift } from "./trends";

export type InsightSeverity = "info" | "success" | "warning" | "critical";
export type InsightCategory = "goal" | "team" | "strategy" | "momentum";

export interface ManagerInsight {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  category: InsightCategory;
  employeeId?: string;
  goalId?: string;
}

// Map checkins to the latest one per goal
function getLatestCheckins(goals: NormalizedGoal[], checkins: QuarterlyCheckin[]): Map<string, QuarterlyCheckin | null> {
  const map = new Map<string, QuarterlyCheckin | null>();
  goals.forEach(goal => {
    const goalCheckins = checkins.filter(c => c.goal_id === goal.id);
    goalCheckins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    map.set(goal.id, goalCheckins[0] || null);
  });
  return map;
}

/**
 * Derives actionable intelligence strictly bound to individual goal states.
 */
export function generateGoalInsights(goals: NormalizedGoal[], checkins: QuarterlyCheckin[]): ManagerInsight[] {
  const insights: ManagerInsight[] = [];
  const latestCheckins = getLatestCheckins(goals, checkins);
  const now = new Date();

  goals.forEach(goal => {
    const latest = latestCheckins.get(goal.id);
    const health = determineGoalHealth(goal, latest);
    const progress = latest ? latest.progress_pct : 0;

    // A. Stalled overdue goals (critical)
    if (health === "stalled" && goal.deadline_date && new Date(goal.deadline_date) < now) {
      insights.push({
        id: `insight-stalled-overdue-${goal.id}`,
        title: "Critical Stoppage",
        description: `"${goal.title}" is completely stalled and past its deadline. Immediate intervention required.`,
        severity: "critical",
        category: "goal",
        employeeId: goal.profile_id,
        goalId: goal.id
      });
    }

    // B. Near-deadline low progress goals (warning)
    if (goal.deadline_date) {
      const daysUntil = (new Date(goal.deadline_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntil > 0 && daysUntil <= 30 && progress > 0 && progress < 50) {
        insights.push({
          id: `insight-near-deadline-low-${goal.id}`,
          title: "Execution Risk",
          description: `"${goal.title}" is due soon but execution is lagging at ${progress}%.`,
          severity: "warning",
          category: "goal",
          employeeId: goal.profile_id,
          goalId: goal.id
        });
      }
    }

    // C. Fully completed goals (success)
    if (health === "completed" || progress === 100) {
      insights.push({
        id: `insight-completed-${goal.id}`,
        title: "Goal Achieved",
        description: `"${goal.title}" has successfully reached 100% completion.`,
        severity: "success",
        category: "goal",
        employeeId: goal.profile_id,
        goalId: goal.id
      });
    }
  });

  return insights;
}

/**
 * Derives aggregate team momentum insights by calculating progress deltas per employee.
 */
export function generateTeamInsights(
  goals: NormalizedGoal[], 
  checkins: QuarterlyCheckin[], 
  profiles: Record<string, string>
): ManagerInsight[] {
  const insights: ManagerInsight[] = [];
  
  // Calculate average delta (latest progress - oldest progress) per employee
  const employeeDeltas = new Map<string, { totalDelta: number, count: number }>();

  goals.forEach(goal => {
    const goalCheckins = checkins.filter(c => c.goal_id === goal.id);
    if (goalCheckins.length < 2) return; // Need at least two points to find a delta

    goalCheckins.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const oldest = goalCheckins[0].progress_pct;
    const newest = goalCheckins[goalCheckins.length - 1].progress_pct;
    const delta = newest - oldest;

    const current = employeeDeltas.get(goal.profile_id) || { totalDelta: 0, count: 0 };
    employeeDeltas.set(goal.profile_id, {
      totalDelta: current.totalDelta + delta,
      count: current.count + 1
    });
  });

  const rankings: { empId: string; avgDelta: number }[] = [];
  for (const [empId, data] of employeeDeltas.entries()) {
    rankings.push({ empId, avgDelta: data.totalDelta / data.count });
  }

  if (rankings.length === 0) return insights;

  rankings.sort((a, b) => b.avgDelta - a.avgDelta);

  const top = rankings[0];
  const bottom = rankings[rankings.length - 1];

  if (top.avgDelta > 0) {
    insights.push({
      id: `insight-top-momentum-${top.empId}`,
      title: "Strong Momentum",
      description: `${profiles[top.empId] || "A team member"} is showing the highest improvement velocity (+${Math.round(top.avgDelta)}% average gain).`,
      severity: "success",
      category: "team",
      employeeId: top.empId
    });
  }

  if (bottom.avgDelta <= 5 && bottom.empId !== top.empId) {
    insights.push({
      id: `insight-low-momentum-${bottom.empId}`,
      title: "Stagnating Performance",
      description: `${profiles[bottom.empId] || "A team member"} is showing the lowest progress momentum across their goals.`,
      severity: "warning",
      category: "team",
      employeeId: bottom.empId
    });
  }

  return insights;
}

/**
 * Derives strategic intelligence by grouping execution success by predefined thrust areas.
 */
export function generateStrategicInsights(goals: NormalizedGoal[], checkins: QuarterlyCheckin[]): ManagerInsight[] {
  const insights: ManagerInsight[] = [];
  const latestCheckins = getLatestCheckins(goals, checkins);
  
  const strategyMap = new Map<string, { totalProgress: number; count: number }>();

  goals.forEach(goal => {
    const latest = latestCheckins.get(goal.id);
    const progress = latest ? latest.progress_pct : 0;
    const area = goal.thrust_area || "General";

    const current = strategyMap.get(area) || { totalProgress: 0, count: 0 };
    strategyMap.set(area, {
      totalProgress: current.totalProgress + progress,
      count: current.count + 1
    });
  });

  const areas: { name: string; avgProgress: number }[] = [];
  for (const [name, data] of strategyMap.entries()) {
    areas.push({ name, avgProgress: data.totalProgress / data.count });
  }

  if (areas.length < 2) return insights;

  areas.sort((a, b) => b.avgProgress - a.avgProgress);
  const strongest = areas[0];
  const weakest = areas[areas.length - 1];

  if (weakest.avgProgress < 40) {
    insights.push({
      id: `insight-strategy-weak-${weakest.name.toLowerCase().replace(/\s+/g, '-')}`,
      title: "Strategic Vulnerability",
      description: `The "${weakest.name}" strategic pillar is underperforming with only ${Math.round(weakest.avgProgress)}% average completion.`,
      severity: "critical",
      category: "strategy"
    });
  }

  if (strongest.avgProgress > 80) {
    insights.push({
      id: `insight-strategy-strong-${strongest.name.toLowerCase().replace(/\s+/g, '-')}`,
      title: "Strategic Excellence",
      description: `The "${strongest.name}" strategic pillar is leading execution at ${Math.round(strongest.avgProgress)}% average completion.`,
      severity: "success",
      category: "strategy"
    });
  }

  return insights;
}

/**
 * Derives intelligence from deterministic forecasts to surface likely missed deadlines or early completions.
 */
export function generateForecastInsights(goals: NormalizedGoal[], checkins: QuarterlyCheckin[]): ManagerInsight[] {
  const insights: ManagerInsight[] = [];
  
  let predictedDelays = 0;
  let predictedExceeds = 0;

  goals.forEach(goal => {
    const forecast = predictGoalCompletion(goal, checkins);
    if (forecast.risk === "Critical Risk" || forecast.risk === "Likely Delayed") predictedDelays++;
    if (forecast.risk === "Likely To Exceed") predictedExceeds++;
  });

  if (predictedDelays >= 3) {
    insights.push({
      id: `insight-forecast-delays`,
      title: "Quarter-Wide Execution Slowdown",
      description: `Forecasts indicate ${predictedDelays} goals are at high risk of missing their deadlines based on current trajectory.`,
      severity: "warning",
      category: "goal"
    });
  }

  if (predictedExceeds >= 3) {
    insights.push({
      id: `insight-forecast-exceeds`,
      title: "Accelerated Delivery",
      description: `Forecasts indicate ${predictedExceeds} goals are tracking ahead of schedule.`,
      severity: "success",
      category: "goal"
    });
  }

  return insights;
}

/**
 * Derives intelligence about broad momentum shifts (acceleration or regression).
 */
export function generateMomentumInsights(goals: NormalizedGoal[], checkins: QuarterlyCheckin[]): ManagerInsight[] {
  const insights: ManagerInsight[] = [];
  let stalling = 0;
  let accelerating = 0;

  goals.forEach(goal => {
    const goalCheckins = checkins.filter(c => c.goal_id === goal.id);
    const shift = detectMomentumShift(goalCheckins);
    if (shift === "Stalling") stalling++;
    if (shift === "Accelerating") accelerating++;
  });

  if (stalling >= 3) {
    insights.push({
      id: `insight-momentum-stalling`,
      title: "Widespread Momentum Loss",
      description: `Execution velocity is actively decelerating across ${stalling} active initiatives.`,
      severity: "warning",
      category: "momentum"
    });
  }

  if (accelerating >= 3) {
    insights.push({
      id: `insight-momentum-accelerating`,
      title: "Strong Execution Cadence",
      description: `Execution velocity is actively accelerating across ${accelerating} initiatives.`,
      severity: "success",
      category: "momentum"
    });
  }

  return insights;
}

/**
 * Derives intelligence about the reliability and predictability of delivery.
 */
export function generateDeliveryConfidenceInsights(goals: NormalizedGoal[], checkins: QuarterlyCheckin[]): ManagerInsight[] {
  const insights: ManagerInsight[] = [];
  let lowConfidence = 0;

  goals.forEach(goal => {
    const forecast = predictGoalCompletion(goal, checkins);
    if (forecast.confidence === "Low") lowConfidence++;
  });

  if (lowConfidence >= 3) {
    insights.push({
      id: `insight-delivery-confidence`,
      title: "Low Delivery Predictability",
      description: `${lowConfidence} initiatives suffer from low tracking confidence due to infrequent or non-existent check-ins.`,
      severity: "info",
      category: "team"
    });
  }

  return insights;
}

/**
 * Master aggregator function that compiles, deduplicates, and sorts all insights.
 */
export function generateManagerInsights(
  goals: NormalizedGoal[], 
  checkins: QuarterlyCheckin[], 
  profiles: Record<string, string>
): ManagerInsight[] {
  const goalInsights = generateGoalInsights(goals, checkins);
  const teamInsights = generateTeamInsights(goals, checkins, profiles);
  const strategicInsights = generateStrategicInsights(goals, checkins);
  const forecastInsights = generateForecastInsights(goals, checkins);
  const momentumInsights = generateMomentumInsights(goals, checkins);
  const deliveryInsights = generateDeliveryConfidenceInsights(goals, checkins);

  const combined = [
    ...goalInsights, 
    ...teamInsights, 
    ...strategicInsights,
    ...forecastInsights,
    ...momentumInsights,
    ...deliveryInsights
  ];

  // 2. Deduplicate strictly by unique ID
  const map = new Map<string, ManagerInsight>();
  combined.forEach(insight => {
    if (!map.has(insight.id)) {
      map.set(insight.id, insight);
    }
  });

  const uniqueInsights = Array.from(map.values());

  // 3. Sort by deterministic severity priority
  const priorityMap: Record<InsightSeverity, number> = {
    critical: 4,
    warning: 3,
    info: 2,
    success: 1
  };

  return uniqueInsights.sort((a, b) => priorityMap[b.severity] - priorityMap[a.severity]);
}
