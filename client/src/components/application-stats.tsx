import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ApplicationHistoryItem, ApplicationStats } from "@shared/schema";
import { useMemo } from "react";

export default function ApplicationStatsComponent() {
  const [history] = useLocalStorage<ApplicationHistoryItem[]>("applicationHistory", []);

  const stats: ApplicationStats = useMemo(() => {
    const total = history.length;
    const successful = history.filter(app => app.status === 'applied').length;
    const failed = history.filter(app => app.status === 'failed').length;
    const needsReview = history.filter(app => app.status === 'needs_review').length;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

    return {
      total,
      successful,
      failed,
      needsReview,
      successRate,
    };
  }, [history]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Statistics</h2>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Applications</span>
            <span className="font-semibold text-lg">{stats.total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Successful</span>
            <span className="font-semibold text-lg text-green-600">{stats.successful}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Failed</span>
            <span className="font-semibold text-lg text-red-600">{stats.failed}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Needs Review</span>
            <span className="font-semibold text-lg text-yellow-600">{stats.needsReview}</span>
          </div>
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="font-semibold text-lg text-primary">{stats.successRate}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
