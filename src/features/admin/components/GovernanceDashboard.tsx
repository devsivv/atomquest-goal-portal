"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldAlert, Unlock, Search, History, AlertCircle, FileKey2 
} from "lucide-react";
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

interface Props {
  auditLogs: AuditLogRecord[];
  lockedGoals: any[];
}

export function GovernanceDashboard({ auditLogs, lockedGoals }: Props) {
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="audit">
        <TabsList className="mb-4">
          <TabsTrigger value="audit" className="gap-2"><History className="h-4 w-4" /> Audit Timeline</TabsTrigger>
          <TabsTrigger value="unlocks" className="gap-2"><FileKey2 className="h-4 w-4" /> Goal Unlocks</TabsTrigger>
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
