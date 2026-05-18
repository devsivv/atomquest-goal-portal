import type { Metadata } from "next";
import { AdminAnalyticsDashboard, AdminAnalyticsData } from "@/features/admin/components/AdminAnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics Dashboard - Admin",
  description: "Enterprise analytics and predictive intelligence for administrative oversight.",
};

export default async function AdminAnalyticsPage() {
  // In a real scenario, this data would be generated server-side using 
  // existing services (e.g., goalsService.getAll()) and passed into 
  // features/quarterly/utils/analytics.ts and forecast.ts.
  // We assume the analytics data is prepared here.
  
  const mockAnalyticsData: AdminAnalyticsData = {
    kpis: {
      totalEmployees: 3450,
      totalGoals: 14250,
      approvalRate: 94,
      averageProgress: 72,
      atRiskGoals: 142,
      overdueGoals: 28,
      teamCompletionPct: 88,
      orgHealthScore: 91,
      averagePerformanceScore: 84,
    },
    quarterlyTrends: [
      { name: "Q1", progress: 24, expected: 25 },
      { name: "Q2", progress: 48, expected: 50 },
      { name: "Q3", progress: 68, expected: 75 },
      { name: "Q4", progress: 0, expected: 100 },
    ],
    departmentPerformance: [
      { department: "Engineering", averageProgress: 81, goalsCount: 3840 },
      { department: "Sales", averageProgress: 88, goalsCount: 2620 },
      { department: "Marketing", averageProgress: 74, goalsCount: 1450 },
      { department: "Product", averageProgress: 79, goalsCount: 1380 },
      { department: "Operations", averageProgress: 62, goalsCount: 2410 },
      { department: "HR & Legal", averageProgress: 92, goalsCount: 1210 },
    ],
    approvalTrends: [
      { month: "Jan", approved: 3200, rejected: 145, revisions: 350 },
      { month: "Feb", approved: 2800, rejected: 120, revisions: 290 },
      { month: "Mar", approved: 3400, rejected: 110, revisions: 330 },
      { month: "Apr", approved: 3950, rejected: 160, revisions: 420 },
    ],
    goalStatusDistribution: [
      { name: "Healthy", value: 10450, fill: "#10b981" },
      { name: "Completed", value: 2650, fill: "#6366f1" },
      { name: "At Risk", value: 850, fill: "#f59e0b" },
      { name: "Stalled", value: 300, fill: "#ef4444" },
    ],
    predictiveRisk: [
      { riskLevel: "Critical Risk", count: 88, fill: "#ef4444" },
      { riskLevel: "Likely Delayed", count: 386, fill: "#f59e0b" },
      { riskLevel: "On Track", count: 8140, fill: "#3b82f6" },
      { riskLevel: "Likely To Exceed", count: 5206, fill: "#10b981" },
    ],
    performanceDistribution: [
      { grade: "Outstanding", count: 420, fill: "#8b5cf6" },
      { grade: "Exceeds Expectations", count: 580, fill: "#3b82f6" },
      { grade: "Meets Expectations", count: 180, fill: "#10b981" },
      { grade: "Needs Improvement", count: 60, fill: "#f59e0b" },
    ],
    teamCompletion: [
      { team: "Frontend", completion: 82 },
      { team: "Backend", completion: 74 },
      { team: "DevOps", completion: 88 },
      { team: "Data", completion: 65 },
    ],
    insights: [
      { id: "1", title: "Strong Engineering Momentum", description: "AI Trend Observation: Engineering is pacing 18% ahead of forecasted Q2 targets, indicating high output efficiency.", type: "success" },
      { id: "2", title: "Operations Stagnating", description: "AI Bottleneck Insight: Cross-functional blockers are slowing Operations down by 22%. Review supply-chain allocations.", type: "critical" },
      { id: "3", title: "Goal Quality Improvement", description: "AI Productivity Recommendation: Leverage smart suggestions during goal drafting to reduce manager revision cycles by 40%.", type: "info" },
      { id: "4", title: "Execution Slowdown", description: "AI Risk Prediction: 386 goals are projected to miss Q3 targets based on current check-in velocity.", type: "warning" },
    ],
    criticalAlerts: [
      { id: "1", title: "Critical Stoppage in Operations", message: "34 high-priority cross-departmental goals are completely stalled and past deadline.", severity: "high" },
      { id: "2", title: "Missing Manager Approvals", message: "145 goals from Q1 remain unapproved in the Sales department, affecting commission structures.", severity: "medium" },
    ],
    managerEffectiveness: [
      { manager: "Sarah Jenkins", teamSize: 12, approvalTimeDays: 1.2, teamProgress: 84 },
      { manager: "David Chen", teamSize: 8, approvalTimeDays: 2.5, teamProgress: 76 },
      { manager: "Elena Rodriguez", teamSize: 15, approvalTimeDays: 4.1, teamProgress: 62 },
      { manager: "Michael Chang", teamSize: 6, approvalTimeDays: 0.8, teamProgress: 91 },
    ],
    departmentLeaderboard: [
      { department: "HR", score: 94, rank: 1, grade: "Outstanding" },
      { department: "Sales", score: 88, rank: 2, grade: "Outstanding" },
      { department: "Engineering", score: 85, rank: 3, grade: "Exceeds Expectations" },
      { department: "Product", score: 79, rank: 4, grade: "Exceeds Expectations" },
      { department: "Marketing", score: 71, rank: 5, grade: "Meets Expectations" },
    ]
  };

  return (
    <AdminAnalyticsDashboard data={mockAnalyticsData} />
  );
}
