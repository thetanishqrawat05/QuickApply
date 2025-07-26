import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, ExternalLink, RotateCcw, CheckCircle, AlertTriangle, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ApplicationHistoryItem } from "@shared/schema";

export default function ApplicationHistory() {
  const [history] = useLocalStorage<ApplicationHistoryItem[]>("applicationHistory", []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied':
        return <CheckCircle className="w-3 h-3" />;
      case 'needs_review':
        return <AlertTriangle className="w-3 h-3" />;
      case 'failed':
        return <X className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'needs_review':
        return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'failed':
        return 'bg-red-500 text-white hover:bg-red-600';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'applied':
        return 'Applied';
      case 'needs_review':
        return 'Needs Review';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <History className="text-secondary" />
            <h2 className="text-lg font-semibold text-gray-900">Application History</h2>
          </div>
          <span className="text-sm text-gray-500">{history.length} applications</span>
        </div>

        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No applications yet</p>
              <p className="text-sm">Your application history will appear here</p>
            </div>
          ) : (
            history.map((application) => (
              <div
                key={application.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge className={getStatusColor(application.status)}>
                        {getStatusIcon(application.status)}
                        <span className="ml-1">{getStatusText(application.status)}</span>
                      </Badge>
                      <h3 className="font-medium text-gray-900">
                        {application.jobTitle || 'Job Application'}
                      </h3>
                    </div>
                    {application.company && (
                      <p className="text-sm text-gray-600 mb-1">{application.company}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {application.status === 'applied' ? 'Applied' : 'Failed'} {formatDate(application.appliedAt)}
                    </p>
                    {application.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">{application.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" asChild>
                      <a 
                        href={application.jobUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-blue-600 text-sm font-medium"
                      >
                        View Job
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                    {application.status !== 'applied' && (
                      <Button variant="ghost" size="sm">
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-4 text-center">
            <Button variant="ghost" className="text-primary hover:text-blue-600">
              View All Applications
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
