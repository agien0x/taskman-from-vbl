import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface ScoreExecutionViewProps {
  execution: {
    input_data: any;
    output_data: any;
  };
}

export function ScoreExecutionView({ execution }: ScoreExecutionViewProps) {
  const { task_title, task_content, quality_criteria } = execution.input_data;
  const { score, reasoning } = execution.output_data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Being Scored</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="font-medium">Title:</span>
            <p className="text-muted-foreground">{task_title}</p>
          </div>
          <div>
            <span className="font-medium">Content:</span>
            <div 
              className="text-muted-foreground prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: task_content }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quality Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: quality_criteria }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">Score:</span>
            <span className="text-2xl font-bold text-primary">{score}/10</span>
          </div>
          <div>
            <span className="font-medium">Reasoning:</span>
            <p className="text-muted-foreground mt-1">{reasoning}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
