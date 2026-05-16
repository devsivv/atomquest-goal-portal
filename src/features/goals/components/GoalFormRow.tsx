"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Trash2 } from "lucide-react";
import { UOM_LABELS } from "@/features/goals/utils/uom";
import type { GoalDraftPayload } from "@/types/goals";

interface GoalFormRowProps {
  index: number;
  onRemove: () => void;
}

export function GoalFormRow({ index, onRemove }: GoalFormRowProps) {
  const { control, watch } = useFormContext<{ goals: GoalDraftPayload[] }>();
  
  const uomType = watch(`goals.${index}.uom_type`);
  const needsTargetValue = uomType && uomType !== "timeline" && uomType !== "zero_based";

  return (
    <Card className="shadow-sm transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Goal #{index + 1}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-4">
        {/* Title & Thrust Area */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4">
          <FormField
            control={control}
            name={`goals.${index}.title`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goal Title *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Increase Q3 revenue" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name={`goals.${index}.thrust_area`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thrust Area *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Financial">Financial</SelectItem>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="Internal Process">Internal Process</SelectItem>
                    <SelectItem value="Learning & Growth">Learning & Growth</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={control}
          name={`goals.${index}.description`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the objective and key deliverables..." 
                  className="resize-none" 
                  {...field} 
                  value={field.value || ""} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Priority, UOM, Target & Weightage */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={control}
            name={`goals.${index}.uom_type`}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Unit of Measurement *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select UOM" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(UOM_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`goals.${index}.weightage`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weightage (%) *</FormLabel>
                <FormControl>
                  <Input type="number" min={10} max={100} placeholder="10" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Dynamic Target/Date row depending on UOM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {needsTargetValue && (
            <FormField
              control={control}
              name={`goals.${index}.target_value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Value *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter target..." {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={control}
            name={`goals.${index}.deadline_date`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deadline Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

      </CardContent>
    </Card>
  );
}
