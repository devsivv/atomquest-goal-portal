"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldAlert, Unlock, Search, History, AlertCircle, FileKey2, 
  Settings2, Activity, Target, ShieldCheck, Clock, Lock, PlayCircle 
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AuditLogRecord } from "@/types/audit";
import { format, formatDistanceToNow } from "date-fns";
import { unlockGoalAction } from "@/features/admin/actions/audit.actions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface GovernanceStats {
  submissionRate: number;
  approvalRate: number;
  lockedGoals: number;
  pendingReviews: number;
  cycleStatus: "planning" | "active" | "review" | "closed";
}

interface Props {
  auditLogs: AuditLogRecord[];
  lockedGoals: any[];
  stats?: GovernanceStats;
}

export function GovernanceDashboard({ auditLogs, lockedGoals, stats }: Props) {
  const [logSearch, setLogSearch] = useState("");
  const [goalSearch, setGoalSearch] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);

  const filteredLogs = auditLogs.filter(
    (log) =>
      !logSearch ||
      log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.actor?.full_name.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.target_goal?.title.toLowerCase().includes(logSearch.toLowerCase())
  );

  const filteredGoals = lockedGoals.filter(
    (g) =>
      !goalSearch ||
      g.title.toLowerCase().includes(goalSearch.toLowerCase()) ||
      (g.profile?.full_name ?? "").toLowerCase().includes(goalSearch.toLowerCase())
  );

  const handleUnlock = async () => {
    if (!selectedGoal) return;
    if (unlockReason.trim().length < 10) {
      toast.error("Please provide a detailed reason (at least 10 characters).");
      return;
    }
    
    setIsUnlocking(true);
    try {
      const res = await unlockGoalAction(selectedGoal.id, unlockReason);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Goal successfully unlocked.");
        setSelectedGoal(null);
        setUnlockReason("");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to unlock goal");
    } finally {
      setIsUnlocking(false);
    }
  };

  const actionColors: Record<string, string> = {
    UNLOCK: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    LOCK: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    APPROVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    REJECT: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    SUBMIT: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    DELETE: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    UPDATE: "bg-muted text-muted-foreground border-border",
    INSERT: "bg-muted text-muted-foreground border-border",
  };

  const [freezeSubmissions, setFreezeSubmissions] = useState(false);
  const [reviewWindowOpen, setReviewWindowOpen] = useState(true);
  const [cycleLocked, setCycleLocked] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Governance & Security</h2>
          <p className="text-muted-foreground">
            Enterprise workflow controls, cycle management, and immutable audit logs.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border">
          <Label htmlFor="quarter-select" className="sr-only">Active Quarter</Label>
          <Select defaultValue="q1-2026">
            <SelectTrigger className="w-[140px] h-9 border-0 shadow-none bg-transparent font-medium">
              <SelectValue placeholder="Select Cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="q1-2026">Q1 FY2026</SelectItem>
              <SelectItem value="q2-2026">Q2 FY2026</SelectItem>
              <SelectItem value="q3-2026">Q3 FY2026</SelectItem>
              <SelectItem value="q4-2026">Q4 FY2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Governance Control Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-indigo-100 dark:border-indigo-900/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-semibold">
                <Lock className="h-4 w-4" /> Cycle Lock
              </div>
              <Switch 
                checked={cycleLocked} 
                onCheckedChange={setCycleLocked}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              Locking the cycle prevents all structural changes to goal definitions across the enterprise.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-100 dark:border-emerald-900/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="h-4 w-4" /> Freeze Submissions
              </div>
              <Switch 
                checked={freezeSubmissions} 
                onCheckedChange={setFreezeSubmissions}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              Halt new goal submissions and edits to force finalization of the current state.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-amber-100 dark:border-amber-900/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500 font-semibold">
                <Settings2 className="h-4 w-4" /> Review Window
              </div>
              <Switch 
                checked={reviewWindowOpen} 
                onCheckedChange={setReviewWindowOpen}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              Open the manager review window to allow approvals, rejections, and feedback.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow bg-slate-50 dark:bg-slate-900/50">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground">Governance Status</span>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase text-[10px]">Secure</Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              <span>{stats?.lockedGoals || 0} goals locked & secured</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Health Panels */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Goal Submission Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold">{stats?.submissionRate || 0}%</span>
              <span className="text-xs text-muted-foreground">Enterprise wide</span>
            </div>
            <Progress value={stats?.submissionRate || 0} className="h-2" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-emerald-500" /> Approval Workflow Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-emerald-600">{stats?.approvalRate || 0}%</span>
              <span className="text-xs text-muted-foreground">Goals Approved</span>
            </div>
            <Progress value={stats?.approvalRate || 0} className="h-2 bg-emerald-100 dark:bg-emerald-950 [&>div]:bg-emerald-500" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Review Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-amber-600">{stats?.pendingReviews || 0}</span>
              <span className="text-xs text-muted-foreground">Pending Reviews</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Managers have {stats?.pendingReviews || 0} goals waiting in queue.
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit">
        <TabsList className="mb-4 bg-muted/50">
          <TabsTrigger value="audit" className="gap-2"><History className="h-4 w-4" /> Activity & Audit</TabsTrigger>
          <TabsTrigger value="unlocks" className="gap-2"><FileKey2 className="h-4 w-4" /> Access Unlocks</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4 m-0">
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Governance Audit Trail</CardTitle>
                  <CardDescription>Immutable record of critical state changes</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search logs..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                  <tr>
                    <th className="px-5 py-3 text-left">Timestamp</th>
                    <th className="px-5 py-3 text-left">Action</th>
                    <th className="px-5 py-3 text-left">Actor</th>
                    <th className="px-5 py-3 text-left">Target Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={actionColors[log.action] ?? actionColors.UPDATE}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{log.actor?.full_name ?? "System"}</p>
                          {log.actor?.role && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {log.actor.role}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {log.target_goal ? (
                          <div>
                            <p className="font-medium max-w-[300px] truncate">{log.target_goal.title}</p>
                            <p className="text-xs text-muted-foreground">Owner: {log.target_goal.owner_name}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{log.table_name} ({log.record_id.substring(0,8)})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No audit logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unlocks" className="space-y-4 m-0">
          <Card className="shadow-sm border-amber-500/20">
            <CardHeader className="border-b bg-amber-500/5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                    <ShieldAlert className="h-5 w-5" /> Goal Lock Governance
                  </CardTitle>
                  <CardDescription>
                    Approved goals are locked by default. Admins can unlock them here in exceptional cases.
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search locked goals..."
                    value={goalSearch}
                    onChange={(e) => setGoalSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                  <tr>
                    <th className="px-5 py-3 text-left">Goal Title</th>
                    <th className="px-5 py-3 text-left">Owner</th>
                    <th className="px-5 py-3 text-left">Cycle</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredGoals.map((g) => (
                    <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium max-w-[300px] truncate">{g.title}</td>
                      <td className="px-5 py-3">
                        <p>{g.profile?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{g.profile?.department}</p>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{g.cycle?.name}</td>
                      <td className="px-5 py-3 text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950"
                          onClick={() => setSelectedGoal(g)}
                        >
                          <Unlock className="h-3.5 w-3.5" /> Unlock Goal
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredGoals.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/50" />
                        No locked goals found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedGoal} onOpenChange={(open) => !open && setSelectedGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" /> Confirm Goal Unlock
            </DialogTitle>
            <DialogDescription>
              You are about to unlock <strong>{selectedGoal?.title}</strong> for {selectedGoal?.profile?.full_name}.
              This will allow the employee to edit the goal content, weightage, and targets.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 p-3 rounded-md text-sm border border-amber-200 dark:border-amber-900">
              This action will be logged in the permanent audit trail. The goal status will revert to <strong>Under Review</strong>.
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unlock Reason (Required)</label>
              <Textarea 
                placeholder="Explain why this goal is being unlocked (min 10 characters)..."
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedGoal(null)} disabled={isUnlocking}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              className="bg-amber-600 hover:bg-amber-700 text-white" 
              onClick={handleUnlock}
              disabled={isUnlocking || unlockReason.trim().length < 10}
            >
              {isUnlocking ? "Unlocking..." : "Unlock Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Temporary inline component to avoid adding more imports
function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
