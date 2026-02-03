import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Star, Clock, CheckCircle, XCircle } from "lucide-react";

interface AnalyticsData {
  totalExecutions: number;
  successRate: number;
  averageRating: number;
  averageDuration: number;
  byType: Record<string, {
    count: number;
    avgRating: number;
    avgDuration: number;
  }>;
}

interface AgentAnalyticsProps {
  agentId: string;
  supabaseClient: any;
}

export function AgentAnalytics({ agentId, supabaseClient }: AgentAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      const { data: executions, error } = await supabaseClient
        .from("agent_executions")
        .select("*")
        .eq("agent_id", agentId);

      if (error) {
        console.error("Error loading analytics:", error);
        setLoading(false);
        return;
      }

      if (!executions || executions.length === 0) {
        setAnalytics(null);
        setLoading(false);
        return;
      }

      const total = executions.length;
      const successful = executions.filter(e => e.status === "success").length;
      const withRating = executions.filter(e => e.rating !== null);
      const avgRating = withRating.length > 0
        ? withRating.reduce((sum, e) => sum + (e.rating || 0), 0) / withRating.length
        : 0;
      const avgDuration = executions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / total;

      const byType: Record<string, any> = {};
      executions.forEach((exec) => {
        if (!byType[exec.execution_type]) {
          byType[exec.execution_type] = {
            executions: [],
          };
        }
        byType[exec.execution_type].executions.push(exec);
      });

      Object.keys(byType).forEach((type) => {
        const execs = byType[type].executions;
        const withRating = execs.filter((e: any) => e.rating !== null);
        byType[type] = {
          count: execs.length,
          avgRating: withRating.length > 0
            ? withRating.reduce((sum: number, e: any) => sum + (e.rating || 0), 0) / withRating.length
            : 0,
          avgDuration: execs.reduce((sum: number, e: any) => sum + (e.duration_ms || 0), 0) / execs.length,
        };
      });

      setAnalytics({
        totalExecutions: total,
        successRate: (successful / total) * 100,
        averageRating: avgRating,
        averageDuration: avgDuration,
        byType,
      });
      setLoading(false);
    };

    loadAnalytics();
  }, [agentId, supabaseClient]);

  if (loading) {
    return <div className="animate-pulse">Loading analytics...</div>;
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No execution data available yet
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalExecutions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.averageDuration)}ms</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Execution Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.byType).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="font-medium">{type}</span>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{data.count} runs</span>
                  <span>{data.avgRating.toFixed(1)} â­</span>
                  <span>{Math.round(data.avgDuration)}ms</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
