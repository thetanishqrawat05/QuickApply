import { useState } from 'react';
import { EnhancedAutoApplyForm } from '@/components/enhanced-auto-apply-form';
import { ApplicationLogsDashboard } from '@/components/application-logs-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { 
  Brain, 
  Key, 
  MessageSquare, 
  Camera, 
  Globe,
  Sparkles,
  BarChart3,
  Plus,
  CheckCircle
} from 'lucide-react';

export default function EnhancedAutoApplyPage() {
  const [activeTab, setActiveTab] = useState('apply');
  const [jobUrl, setJobUrl] = useState('');
  const [applicationStarted, setApplicationStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Enhanced Auto Job Applier
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Advanced automation with AI cover letters, auto-login, and multi-channel notifications
          </p>
          
          <div className="flex justify-center gap-2 mb-6">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              AI-Powered Cover Letters
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Key className="h-3 w-3" />
              Auto-Login Support
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              WhatsApp Notifications
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              Screenshot Capture
            </Badge>
            <Badge variant="destructive" className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              REAL SUBMISSION MODE
            </Badge>
          </div>
          
          {/* NEW: Real Application Notice */}
          <Alert className="max-w-4xl mx-auto mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>🎉 NEW: Real Application Mode Available!</strong> After entering a job URL below, you can now toggle between 
              simulation mode (email review) and <strong>REAL application submission</strong> that actually submits to company portals. 
              You'll receive confirmation emails from companies and see applications in your job site accounts.
            </AlertDescription>
          </Alert>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="apply" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Application
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard & Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apply">
            {applicationStarted && sessionId ? (
              <Card className="max-w-2xl mx-auto">
                <CardHeader className="text-center">
                  <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                  <CardTitle className="text-2xl text-green-700">
                    Enhanced Auto-Apply Started Successfully!
                  </CardTitle>
                  <CardDescription>
                    Your advanced job application workflow is now running with all enhanced features enabled.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p><strong>Session ID:</strong> {sessionId}</p>
                        <p><strong>Enhanced Features Active:</strong></p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li>Auto-login to company portals</li>
                          <li>AI-generated cover letter</li>
                          <li>CAPTCHA detection and handling</li>
                          <li>Email and WhatsApp notifications</li>
                          <li>Screenshot capture upon submission</li>
                          <li>60-second auto-submit timer</li>
                          <li>Comprehensive application logging</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">What's happening now:</h3>
                    <div className="space-y-2 text-blue-800 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>Browser automation in progress</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>Form fields being auto-filled</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>Review notifications sent</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={startNewApplication} variant="outline" className="flex-1">
                      Start New Application
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('dashboard')} 
                      className="flex-1"
                    >
                      View Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Job URL Input
                    </CardTitle>
                    <CardDescription>
                      Enter the job posting URL to start the enhanced auto-apply workflow
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="jobUrl">Job URL</Label>
                        <Input
                          id="jobUrl"
                          type="url"
                          placeholder="https://company.com/careers/job-123"
                          value={jobUrl}
                          onChange={(e) => setJobUrl(e.target.value)}
                          className="mt-1"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Supports: Greenhouse, Lever, Workday, BambooHR, SmartRecruiters, and company career sites
                        </p>
                        <Alert className="mt-3 border-blue-200 bg-blue-50">
                          <Globe className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800">
                            <strong>Ready for Real Applications:</strong> Once you enter a URL, you'll see the new "Real Application Submission" toggle in the form below!
                          </AlertDescription>
                        </Alert>
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
            )}
          </TabsContent>

          <TabsContent value="dashboard">
            <ApplicationLogsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}