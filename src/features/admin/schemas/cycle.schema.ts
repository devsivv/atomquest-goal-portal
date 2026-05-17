import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

export const CycleWindowSchema = z.object({
  id: z.string().uuid().optional(), // Optional for new creations
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  start_date: dateString,
  end_date: dateString,
  submission_deadline: dateString,
  review_deadline: dateString,
}).refine(data => data.end_date > data.start_date, {
  message: "End date must be after start date",
  path: ["end_date"]
}).refine(data => data.submission_deadline >= data.end_date, {
  message: "Submission deadline must be on or after end date",
  path: ["submission_deadline"]
}).refine(data => data.review_deadline >= data.submission_deadline, {
  message: "Review deadline must be on or after submission deadline",
  path: ["review_deadline"]
});

export const PerformanceCycleSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(255),
  start_date: dateString,
  end_date: dateString,
  windows: z.array(CycleWindowSchema).length(4, "Must provide exactly 4 quarters"),
}).refine(data => data.end_date > data.start_date, {
  message: "End date must be after start date",
  path: ["end_date"]
});

export type CycleFormValues = z.infer<typeof PerformanceCycleSchema>;
export type WindowFormValues = z.infer<typeof CycleWindowSchema>;
