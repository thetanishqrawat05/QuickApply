import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SystemStatus {
  status: {
    database: boolean;
    email: boolean;
    ai: boolean;
    whatsapp: boolean;
    jwt: boolean;
  };
  configured: boolean;
  features: {
    jobApplication: boolean;
    aiCoverLetters: boolean;
    emailNotifications: boolean;
    whatsappNotifications: boolean;
    secureLogin: boolean;
    browserAutomation: boolean;
  };
}

export function SystemStatus() {
  const { data: systemStatus, isLoading } = useQuery<SystemStatus>({
    queryKey: ['/api/system-info'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading || !systemStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading system status...</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean, label: string) => {
    return (
      <Badge 
        variant={status ? "default" : "destructive"}
        className={status ? "bg-green-500" : "bg-red-500"}
      >
        {label}: {status ? "Ready" : "Not Configured"}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {systemStatus.configured ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          )}
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center gap-2">
          <Badge 
            variant={systemStatus.configured ? "default" : "secondary"}
            className={systemStatus.configured ? "bg-green-500" : "bg-yellow-500"}
          >
            {systemStatus.configured ? "Fully Configured" : "Partial Configuration"}
          </Badge>
        </div>

        {/* Core Services */}
        <div>
          <h4 className="font-medium mb-2">Core Services</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(systemStatus.status.database)}
              <span className="text-sm">Database</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(systemStatus.status.email)}
              <span className="text-sm">Email</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(systemStatus.status.ai)}
              <span className="text-sm">AI Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(systemStatus.status.jwt)}
              <span className="text-sm">Security</span>
            </div>
          </div>
        </div>

        {/* Optional Services */}
        <div>
          <h4 className="font-medium mb-2">Optional Services</h4>
          <div className="flex items-center gap-2">
            {getStatusIcon(systemStatus.status.whatsapp)}
            <span className="text-sm">WhatsApp Notifications</span>
          </div>
        </div>

        {/* Available Features */}
        <div>
          <h4 className="font-medium mb-2">Available Features</h4>
          <div className="flex flex-wrap gap-1">
            {getStatusBadge(systemStatus.features.jobApplication, "Job Applications")}
            {getStatusBadge(systemStatus.features.aiCoverLetters, "AI Cover Letters")}
            {getStatusBadge(systemStatus.features.emailNotifications, "Email Alerts")}
            {getStatusBadge(systemStatus.features.secureLogin, "Secure Login")}
            {getStatusBadge(systemStatus.features.browserAutomation, "Browser Automation")}
            {getStatusBadge(systemStatus.features.whatsappNotifications, "WhatsApp")}
          </div>
        </div>

        {!systemStatus.configured && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Setup Required:</strong> Add missing secrets in Replit Secrets panel for full functionality.
              See DEPLOYMENT.md for detailed setup instructions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}