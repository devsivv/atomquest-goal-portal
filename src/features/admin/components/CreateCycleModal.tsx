"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PerformanceCycleSchema, type CycleFormValues } from "../schemas/cycle.schema";
import { createPerformanceCycleAction } from "../actions/cycle.actions";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCycleModal({ open, onOpenChange, onSuccess }: CreateCycleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CycleFormValues>({
    resolver: zodResolver(PerformanceCycleSchema),
    defaultValues: {
      name: "",
      start_date: "",
      end_date: "",
      windows: [
        { quarter: "Q1", start_date: "", end_date: "", submission_deadline: "", review_deadline: "" },
        { quarter: "Q2", start_date: "", end_date: "", submission_deadline: "", review_deadline: "" },
        { quarter: "Q3", start_date: "", end_date: "", submission_deadline: "", review_deadline: "" },
        { quarter: "Q4", start_date: "", end_date: "", submission_deadline: "", review_deadline: "" },
      ]
    }
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "windows"
  });

  const onSubmit = async (data: CycleFormValues) => {
    setIsSubmitting(true);
    const result = await createPerformanceCycleAction(data);
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Cycle created successfully. It is currently in draft mode.");
      form.reset();
      onSuccess();
    } else {
      toast.error(result.error || "Failed to create cycle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Create Performance Cycle</DialogTitle>
          <DialogDescription>
            Configure the global timeline and quarterly windows for the new cycle.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <form id="create-cycle-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
            
            {/* Global Cycle Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cycle Name</Label>
                <Input placeholder="e.g. FY 2026 Performance Cycle" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-[0.8rem] text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" {...form.register("start_date")} />
                  {form.formState.errors.start_date && <p className="text-[0.8rem] text-destructive">{form.formState.errors.start_date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" {...form.register("end_date")} />
                  {form.formState.errors.end_date && <p className="text-[0.8rem] text-destructive">{form.formState.errors.end_date.message}</p>}
                </div>
              </div>
            </div>

            {/* Quarterly Windows */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold border-b pb-2">Quarterly Windows</h4>
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 rounded-lg border bg-muted/20 space-y-4">
                  <h5 className="font-medium text-sm text-primary">{field.quarter} Settings</h5>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Start Date</Label>
                      <Input type="date" className="h-8 text-sm" {...form.register(`windows.${index}.start_date`)} />
                      {form.formState.errors.windows?.[index]?.start_date && <p className="text-[0.8rem] text-destructive">{form.formState.errors.windows[index]?.start_date?.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">End Date</Label>
                      <Input type="date" className="h-8 text-sm" {...form.register(`windows.${index}.end_date`)} />
                      {form.formState.errors.windows?.[index]?.end_date && <p className="text-[0.8rem] text-destructive">{form.formState.errors.windows[index]?.end_date?.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Submission Deadline</Label>
                      <Input type="date" className="h-8 text-sm" {...form.register(`windows.${index}.submission_deadline`)} />
                      {form.formState.errors.windows?.[index]?.submission_deadline && <p className="text-[0.8rem] text-destructive">{form.formState.errors.windows[index]?.submission_deadline?.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Manager Review Deadline</Label>
                      <Input type="date" className="h-8 text-sm" {...form.register(`windows.${index}.review_deadline`)} />
                      {form.formState.errors.windows?.[index]?.review_deadline && <p className="text-[0.8rem] text-destructive">{form.formState.errors.windows[index]?.review_deadline?.message}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </form>
        </ScrollArea>

        <DialogFooter className="p-6 pt-2 border-t mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="create-cycle-form" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Cycle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
