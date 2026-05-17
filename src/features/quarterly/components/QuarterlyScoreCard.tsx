import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface QuarterlyScoreCardProps {
  title: string;
  value: string;
  description: string;
  progressValue?: number;
}

export function QuarterlyScoreCard({ title, value, description, progressValue }: QuarterlyScoreCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {progressValue !== undefined && (
          <Progress value={progressValue} className="mt-3 h-2 transition-all duration-500 ease-out" />
        )}
      </CardContent>
    </Card>
  );
}
