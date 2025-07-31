import { useState } from 'react';
import { EnhancedProfileForm } from '@/components/enhanced-profile-form';
import { ApplicationLogsDashboard } from '@/components/application-logs-dashboard';
import { Logo } from '@/components/ui/logo';
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
              <Logo size="md" />
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

              <TabsContent value="apply" className="space-y-6">
                <div className="max-w-2xl mx-auto">
                  {/* Header Section */}
                  <div className="text-center mb-8 fade-in-up">
                    <h2 className="text-3xl font-bold gradient-text mb-3">Start Your Application</h2>
                    <p className="text-muted-foreground text-lg">
                      Enter a job URL to begin the intelligent auto-apply process
                    </p>
                  </div>

                  {/* URL Input Card */}
                  <Card className="glass-card shadow-soft hover:shadow-medium transition-all duration-300 fade-in-up stagger-1">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <Plus className="h-5 w-5 text-primary" />
                        </div>
                        Job Application URL
                      </CardTitle>
                      <CardDescription className="text-base">
                        Supports major platforms: Greenhouse, Lever, Workday, BambooHR, SmartRecruiters, and more
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="jobUrl" className="text-sm font-medium">Job URL</Label>
                        <Input
                          id="jobUrl"
                          value={jobUrl}
                          onChange={(e) => setJobUrl(e.target.value)}
                          placeholder="https://company.com/careers/job-posting"
                          className="text-lg h-12 glass-card border-0 shadow-soft focus:shadow-medium transition-all duration-200 interactive-scale"
                        />
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Compatible with 50+ job platforms and company career sites
                        </p>
                      </div>

                      {/* Info Banner */}
                      <div className="glass-card bg-gradient-to-r from-blue-50/50 to-purple-50/50 border border-primary/20 rounded-xl p-4 pulse-glow">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-primary mb-1">
                              🚀 Ready for AI-Powered Applications
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Once you enter a URL, our comprehensive application form will appear with AI cover letter generation, auto-login, and smart form filling capabilities.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dynamic Form Section */}
                  {jobUrl && (
                    <div className="mt-8 fade-in-up stagger-2">
                      <EnhancedProfileForm 
                        jobUrl={jobUrl} 
                        onSuccess={handleApplicationSuccess}
                      />
                    </div>
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
            <Card className="max-w-2xl mx-auto glass-card shadow-medium fade-in-up">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 w-20 h-20 flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <CardTitle className="text-3xl gradient-text mb-2">
                  Auto-Apply Started Successfully!
                </CardTitle>
                <CardDescription className="text-lg">
                  Your job application workflow is now running with all advanced features enabled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="glass-card rounded-xl p-6 bg-gradient-to-br from-green-50/30 to-emerald-50/30 border border-green-200/50 fade-in-up stagger-1">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 border border-green-200">
                      <Sparkles className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-green-800">Session ID:</span>
                          <code className="px-2 py-1 bg-green-100 rounded text-xs font-mono text-green-700">{sessionId}</code>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-800 mb-2">🎯 Active Features:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[
                              'Auto-login to company portals',
                              'AI-generated cover letter',
                              'CAPTCHA detection and handling',
                              'Email and WhatsApp notifications',
                              'Screenshot capture upon submission',
                              '60-second auto-submit timer',
                              'Comprehensive application logging',
                              'Smart form field detection'
                            ].map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs text-green-700">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-xl bg-gradient-to-br from-primary/5 to-purple/5 border border-primary/20 fade-in-up stagger-2">
                  <h3 className="font-semibold gradient-text mb-4 text-lg flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-primary/10">
                      <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                    </div>
                    What's happening now:
                  </h3>
                  <div className="space-y-3">
                    {[
                      { text: 'Browser automation in progress', delay: '0s' },
                      { text: 'Form fields being auto-filled', delay: '0.5s' },
                      { text: 'Review notifications sent', delay: '1s' },
                      { text: 'AI analyzing job requirements', delay: '1.5s' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm" style={{ animationDelay: item.delay }}>
                        <div className="relative">
                          <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                          <div className="absolute inset-0 w-3 h-3 bg-primary/30 rounded-full animate-ping"></div>
                        </div>
                        <span className="text-muted-foreground">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={startNewApplication}
                  className="w-full gradient-primary shadow-soft hover:shadow-medium transition-all duration-200 interactive-scale text-lg py-6"
                >
                  <Plus className="h-5 w-5 mr-2" />
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