"use client";

import { useState } from "react";
import { Plus, CalendarDays, Activity, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PerformanceCycle } from "@/types/cycles";
import { format } from "date-fns";
import { activateCycleAction, archiveCycleAction } from "../actions/cycle.actions";
import { toast } from "sonner";
import { CreateCycleModal } from "./CreateCycleModal";
import { useRouter } from "next/navigation";

interface CyclesDashboardProps {
  initialCycles: PerformanceCycle[];
}

export function CyclesDashboard({ initialCycles }: CyclesDashboardProps) {
  const router = useRouter();
  const [cycles, setCycles] = useState<PerformanceCycle[]>(initialCycles);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const activeCycle = cycles.find(c => c.status === "active");
  const draftCycles = cycles.filter(c => c.status === "draft");

  async function handleActivate(id: string) {
    setLoading(id);
    const result = await activateCycleAction(id);
    setLoading(null);
    if (result.success) {
      toast.success("Cycle activated successfully");
      router.refresh();
      // Optimistic update
      setCycles(prev => prev.map(c => 
        c.id === id ? { ...c, status: "active" } : 
        c.status === "active" ? { ...c, status: "archived" } : c
      ));
    } else {
      toast.error(result.error || "Failed to activate cycle");
    }
  }

  async function handleArchive(id: string) {
    setLoading(id);
    const result = await archiveCycleAction(id);
    setLoading(null);
    if (result.success) {
      toast.success("Cycle archived successfully");
      router.refresh();
      setCycles(prev => prev.map(c => c.id === id ? { ...c, status: "archived" } : c));
    } else {
      toast.error(result.error || "Failed to archive cycle");
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-border transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Cycle</p>
                <p className="mt-2 text-2xl font-bold">{activeCycle?.name || "None"}</p>
              </div>
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Draft Cycles</p>
                <p className="mt-2 text-2xl font-bold">{draftCycles.length}</p>
              </div>
              <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm transition-all duration-300 active:scale-[0.98]">
            <Plus className="h-4 w-4" />
            Create New Cycle
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <Card className="shadow-sm transition-all duration-300 ease-out hover:shadow-md">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-lg">All Cycles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cycles.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Archive className="h-12 w-12 mb-4 opacity-20" />
              <p>No cycles configured.</p>
              <Button variant="link" onClick={() => setIsCreateOpen(true)}>Create one now</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Timeline</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cycles.map((cycle) => (
                    <tr key={cycle.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{cycle.name}</td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={cycle.status === 'active' ? "default" : cycle.status === 'draft' ? "secondary" : "outline"}
                          className={cycle.status === 'active' ? "bg-green-500/15 text-green-600 dark:bg-green-500/10 dark:text-green-400 hover:bg-green-500/25 border-green-500/20" : ""}
                        >
                          {cycle.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(cycle.start_date), "MMM d, yyyy")} - {format(new Date(cycle.end_date), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {cycle.status === "draft" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={loading === cycle.id}
                            onClick={() => handleActivate(cycle.id)}
                          >
                            Activate
                          </Button>
                        )}
                        {cycle.status === "active" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={loading === cycle.id}
                            onClick={() => handleArchive(cycle.id)}
                          >
                            Archive
                          </Button>
                        )}
                        {cycle.status === "archived" && (
                          <span className="text-muted-foreground text-xs italic">Read Only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCycleModal 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        onSuccess={() => {
          setIsCreateOpen(false);
          router.refresh();
          // Ideally fetch fresh cycles but refresh handles it
        }} 
      />
    </div>
  );
}
