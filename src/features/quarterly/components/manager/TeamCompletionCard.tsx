import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamCompletionCardProps {
  title: string;
  value: string | number;
  subtext: string;
}

export const TeamCompletionCard = memo(function TeamCompletionCard({ title, value, subtext }: TeamCompletionCardProps) {
  return (
    <Card className="shadow-sm border-border transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
});
