import { useState } from 'react';
import { EnhancedAutoApplyForm } from '@/components/enhanced-auto-apply-form';
import { ApplicationLogsDashboard } from '@/components/application-logs-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from 'wouter';

import { 
  Globe,
  Sparkles,
  BarChart3,
  Plus,
  CheckCircle,
  LogOut,
  User
} from 'lucide-react';

export default function AutoApplyPage() {
  const [activeTab, setActiveTab] = useState('apply');
  const [jobUrl, setJobUrl] = useState('');
  const [applicationStarted, setApplicationStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleApplicationSuccess = (newSessionId: string) => {
    setSessionId(newSessionId);
    setApplicationStarted(true);
    setActiveTab('dashboard');
  };

  const startNewApplication = () => {
    setJobUrl('');
    setApplicationStarted(false);
    setSessionId(null);
    setActiveTab('apply');
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail'); 
    setLocation('/');
  };

  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/50 to-background">
      {/* Header */}
      <header className="glass-card border-b">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Auto Job Applier</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Applications</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{userEmail}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="glass-card border-0 interactive-scale"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!applicationStarted ? (
          <div className="space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 glass-card shadow-soft interactive-scale">
                <TabsTrigger value="apply" className="flex items-center gap-2 transition-all duration-200">
                  <Plus className="h-4 w-4" />
                  New Application
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex items-center gap-2 transition-all duration-200">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard & Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="apply">
                <div className="space-y-6">
                  <Card className="glass-card shadow-soft">
                    <CardHeader>
                      <CardTitle className="gradient-text">Start Your Application</CardTitle>
                      <CardDescription>
                        Enter a job URL to begin the auto-apply process
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="jobUrl">Job URL</Label>
                          <Input
                            id="jobUrl"
                            placeholder="https://company.com/careers/job-posting"
                            value={jobUrl}
                            onChange={(e) => setJobUrl(e.target.value)}
                            className="mt-1"
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Supports: Greenhouse, Lever, Workday, BambooHR, SmartRecruiters, and company career sites
                          </p>
                          <div className="glass-card rounded-xl p-4 mt-3">
                            <div className="flex items-start space-x-3">
                              <div className="p-2 rounded-lg bg-blue-100 border border-blue-200">
                                <Globe className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm text-blue-800">
                                  <strong>Ready for Applications:</strong> Once you enter a URL, you'll see the comprehensive application form below!
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {jobUrl && (
                    <EnhancedAutoApplyForm 
                      jobUrl={jobUrl} 
                      onSuccess={handleApplicationSuccess}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="dashboard">
                <ApplicationLogsDashboard />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Success State */}
            <Card className="max-w-2xl mx-auto glass-card shadow-medium">
              <CardHeader className="text-center">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                <CardTitle className="text-2xl gradient-text">
                  Auto-Apply Started Successfully!
                </CardTitle>
                <CardDescription>
                  Your job application workflow is now running with all advanced features enabled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-green-100 border border-green-200">
                      <Sparkles className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="space-y-2 text-green-800">
                        <p><strong>Session ID:</strong> {sessionId}</p>
                        <p><strong>Features Active:</strong></p>
                        <ul className="list-disc ml-4 space-y-1 text-sm">
                          <li>Auto-login to company portals</li>
                          <li>AI-generated cover letter</li>
                          <li>CAPTCHA detection and handling</li>
                          <li>Email and WhatsApp notifications</li>
                          <li>Screenshot capture upon submission</li>
                          <li>60-second auto-submit timer</li>
                          <li>Comprehensive application logging</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-lg">
                  <h3 className="font-semibold gradient-text mb-2">What's happening now:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <span>Browser automation in progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <span>Form fields being auto-filled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <span>Review notifications sent</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={startNewApplication}
                  className="w-full gradient-primary shadow-soft hover:shadow-medium transition-all duration-200 interactive-scale"
                >
                  Start New Application
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}