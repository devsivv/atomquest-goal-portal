"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkinFormSchema, CheckinFormValues } from "../schemas/checkin.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { QuarterlyCheckin, QuarterLabel, NormalizedGoal } from "@/types";
import { Badge } from "@/components/ui/badge";

interface CheckinFormProps {
  goal: NormalizedGoal;
  existingCheckin: QuarterlyCheckin | null;
  quarter: QuarterLabel;
  onSubmit: (values: CheckinFormValues, isSubmit: boolean) => Promise<void>;
  isSubmitting: boolean;
}

export function CheckinForm({ goal, existingCheckin, quarter, onSubmit, isSubmitting }: CheckinFormProps) {
  const form = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinFormSchema),
    defaultValues: {
      progressPct: existingCheckin?.progress_pct ?? 0,
      employeeNotes: existingCheckin?.employee_notes ?? "",
    },
  });

  const isAcknowledged = existingCheckin?.checkin_status === "acknowledged";
  const isSubmitted = existingCheckin?.checkin_status === "submitted";
  const isReadOnly = isAcknowledged || isSubmitted;

  return (
    <Form {...form}>
      <form className="space-y-5 border border-border p-5 rounded-lg bg-card shadow-sm transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4 pb-3 border-b">
          <div>
            <h4 className="font-semibold text-lg">{goal.title}</h4>
            {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Weightage: {goal.weightage}%</Badge>
            {existingCheckin && (
              <Badge variant={isAcknowledged ? "default" : "outline"} className={isAcknowledged ? "bg-green-600" : ""}>
                {existingCheckin.checkin_status}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="progressPct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Progress Percentage (0-100)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g. 50"
                    disabled={isReadOnly} 
                    {...field} 
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="employeeNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes & Blockers</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe your progress, achievements, or any blockers..." 
                    className="resize-none h-24"
                    disabled={isReadOnly} 
                    {...field} 
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!isReadOnly && (
          <div className="flex flex-wrap gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              disabled={isSubmitting} 
              onClick={form.handleSubmit(v => onSubmit(v, false))}
            >
              Save Draft
            </Button>
            <Button 
              type="button" 
              disabled={isSubmitting} 
              onClick={form.handleSubmit(v => onSubmit(v, true))}
            >
              Submit Check-in
            </Button>
          </div>
        )}
        
        {isReadOnly && (
          <div className="mt-4 p-3 bg-muted rounded-md text-sm flex items-center gap-2 text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            This check-in has been <strong>{existingCheckin?.checkin_status}</strong> and cannot be modified.
          </div>
        )}
      </form>
    </Form>
  );
}
