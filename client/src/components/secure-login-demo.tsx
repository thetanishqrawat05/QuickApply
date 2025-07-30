import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock, Mail, MessageSquare, Shield, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SystemStatus } from '@/components/system-status';

interface LoginSession {
  id: string;
  platform: string;
  jobUrl: string;
  loginStatus: string;
  createdAt: string;
  expiresAt: string;
  userEmail: string;
  authMethod: string;
}

interface DashboardData {
  pendingLogins: LoginSession[];
  completedLogins: LoginSession[];
  expiredLogins: LoginSession[];
}

export function SecureLoginDemo() {
  const [formData, setFormData] = useState({
    sessionId: '',
    userId: '1',
    userEmail: '',
    jobUrl: '',
    platform: '',
    loginUrl: '',
    authMethod: 'manual',
    enableWhatsApp: false,
    whatsappNumber: ''
  });

  const queryClient = useQueryClient();

  // Fetch login dashboard data
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: [`/api/users/${formData.userId}/login-dashboard`],
    enabled: !!formData.userId
  });

  // Create secure login session mutation
  const createLoginMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/create-secure-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${formData.userId}/login-dashboard`] });
      setFormData(prev => ({ ...prev, sessionId: '', jobUrl: '', platform: '', loginUrl: '' }));
    }
  });

  // Cleanup expired sessions mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cleanup-expired-logins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${formData.userId}/login-dashboard`] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLoginMutation.mutate({
      ...formData,
      sessionId: formData.sessionId || `session-${Date.now()}`,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Pending' },
      completed: { color: 'bg-green-500', text: 'Completed' },
      expired: { color: 'bg-red-500', text: 'Expired' },
      failed: { color: 'bg-red-600', text: 'Failed' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🔐 Secure Login Link System</h1>
        <p className="text-gray-600">
          Demo interface for testing the secure login link workflow for job applications
        </p>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="create">Create Login Link</TabsTrigger>
          <TabsTrigger value="dashboard">Login Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          <SystemStatus />
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Create Secure Login Session
              </CardTitle>
              <CardDescription>
                Generate a secure login link for job portals that require authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userEmail">User Email</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={formData.userEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, userEmail: e.target.value }))}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="platform">Job Platform</Label>
                    <Input
                      id="platform"
                      value={formData.platform}
                      onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                      placeholder="e.g., google, linkedin, workday"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="jobUrl">Job URL</Label>
                    <Input
                      id="jobUrl"
                      type="url"
                      value={formData.jobUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, jobUrl: e.target.value }))}
                      placeholder="https://careers.company.com/job/123"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="loginUrl">Login URL</Label>
                    <Input
                      id="loginUrl"
                      type="url"
                      value={formData.loginUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, loginUrl: e.target.value }))}
                      placeholder="https://careers.company.com/login"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sessionId">Session ID (Optional)</Label>
                    <Input
                      id="sessionId"
                      value={formData.sessionId}
                      onChange={(e) => setFormData(prev => ({ ...prev, sessionId: e.target.value }))}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="whatsappNumber">WhatsApp Number (Optional)</Label>
                    <Input
                      id="whatsappNumber"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                      placeholder="+1234567890"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableWhatsApp"
                    checked={formData.enableWhatsApp}
                    onChange={(e) => setFormData(prev => ({ ...prev, enableWhatsApp: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="enableWhatsApp" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Enable WhatsApp notifications
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createLoginMutation.isPending}
                >
                  {createLoginMutation.isPending ? 'Creating...' : 'Create Secure Login Link'}
                </Button>

                {createLoginMutation.data && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <h3 className="font-medium text-green-800 mb-2">✅ Login link created successfully!</h3>
                    <p className="text-green-700 text-sm">
                      {createLoginMutation.data.message}
                    </p>
                    <p className="text-green-600 text-xs mt-1">
                      Expires: {new Date(createLoginMutation.data.expiresAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {createLoginMutation.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <h3 className="font-medium text-red-800 mb-2">❌ Error creating login link</h3>
                    <p className="text-red-700 text-sm">
                      {(createLoginMutation.error as any)?.message || 'An error occurred'}
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Login Dashboard</h2>
            <Button 
              onClick={() => cleanupMutation.mutate()}
              disabled={cleanupMutation.isPending}
              variant="outline"
            >
              {cleanupMutation.isPending ? 'Cleaning...' : 'Cleanup Expired'}
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading dashboard...</div>
          ) : (
            <div className="grid gap-6">
              {/* Pending Logins */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Pending Logins ({dashboardData?.pendingLogins?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.pendingLogins?.length ? (
                    <div className="space-y-3">
                      {dashboardData.pendingLogins.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{session.platform}</p>
                            <p className="text-sm text-gray-600">{session.userEmail}</p>
                            <a 
                              href={session.jobUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              View Job <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(session.loginStatus)}
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {formatDate(session.createdAt)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Expires: {formatDate(session.expiresAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No pending logins</p>
                  )}
                </CardContent>
              </Card>

              {/* Completed Logins */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    Completed Logins ({dashboardData?.completedLogins?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.completedLogins?.length ? (
                    <div className="space-y-3">
                      {dashboardData.completedLogins.slice(0, 5).map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{session.platform}</p>
                            <p className="text-sm text-gray-600">{session.userEmail}</p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(session.loginStatus)}
                            <p className="text-xs text-gray-500 mt-1">
                              Completed: {formatDate(session.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No completed logins</p>
                  )}
                </CardContent>
              </Card>

              {/* Expired Logins */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-red-500" />
                    Expired Logins ({dashboardData?.expiredLogins?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.expiredLogins?.length ? (
                    <div className="space-y-3">
                      {dashboardData.expiredLogins.slice(0, 3).map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{session.platform}</p>
                            <p className="text-sm text-gray-600">{session.userEmail}</p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(session.loginStatus)}
                            <p className="text-xs text-gray-500 mt-1">
                              Expired: {formatDate(session.expiresAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No expired logins</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}