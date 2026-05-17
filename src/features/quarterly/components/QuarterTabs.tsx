import { Button } from "@/components/ui/button";
import { QuarterLabel } from "@/types";

interface QuarterTabsProps {
  activeQuarter: QuarterLabel;
  onQuarterChange: (quarter: QuarterLabel) => void;
}

export function QuarterTabs({ activeQuarter, onQuarterChange }: QuarterTabsProps) {
  const quarters: QuarterLabel[] = ["Q1", "Q2", "Q3", "Q4"];

  return (
    <div className="flex space-x-2 border-b border-border pb-4">
      {quarters.map((q) => (
        <Button
          key={q}
          variant={activeQuarter === q ? "default" : "outline"}
          onClick={() => onQuarterChange(q)}
          className="w-24 font-semibold"
        >
          {q}
        </Button>
      ))}
    </div>
  );
}
