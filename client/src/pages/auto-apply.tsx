import { useState } from 'react';
import { EnhancedAutoApplyForm } from '@/components/enhanced-auto-apply-form';
import { ApplicationLogsDashboard } from '@/components/application-logs-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModernHero } from '@/components/ui/modern-hero';
import { ModernCard, FeatureCard } from '@/components/ui/modern-card';
import { SeamlessFeedback } from '@/components/ui/seamless-feedback';

import { 
  Brain, 
  Key, 
  MessageSquare, 
  Camera, 
  Globe,
  Sparkles,
  BarChart3,
  Plus,
  CheckCircle,
  AlertTriangle,
  Target,
  Shield,
  Clock,
  Zap,
  Mail,
  Bot
} from 'lucide-react';

export default function AutoApplyPage() {
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
    <div className="min-h-screen">
      {/* Modern Hero Section */}
      <ModernHero
        title="Apply to Jobs in Seconds"
        subtitle="AI-Powered Job Applications"
        description="The world's most advanced job application automation tool. Generate AI cover letters, handle secure logins, and get notifications via email and WhatsApp."
        primaryAction={{
          label: "Start Applying",
          onClick: () => setActiveTab('apply')
        }}
        secondaryAction={{
          label: "View Dashboard",
          onClick: () => setActiveTab('dashboard')
        }}
        features={[
          "AI-Generated Cover Letters",
          "Secure Auto-Login",
          "WhatsApp Notifications"
        ]}
      />

      {/* Stats Section */}
      <section className="py-16 bg-background/50">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <ModernCard
              title="Success Rate"
              description="Applications successfully submitted"
              icon={Target}
              badge="97%"
              delay={0.1}
              interactive={true}
            />
            <ModernCard
              title="Time Saved"
              description="Average time saved per application"
              icon={Clock}
              badge="15 min"
              delay={0.2}
              interactive={true}
            />
            <ModernCard
              title="Accuracy"
              description="Form filling accuracy rate"
              icon={Shield}
              badge="99%"
              delay={0.3}
              interactive={true}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {!applicationStarted ? (
          <div className="space-y-16">
            {/* Features Grid */}
            <section>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold gradient-text mb-4 fade-in-up">
                  Choose Your Application Method
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto fade-in-up stagger-1">
                  Select the perfect automation level for your job search strategy
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <ModernCard
                  title="Auto Apply"
                  description="Full automation with AI cover letters, auto-login, and multi-channel notifications"
                  delay={0.1}
                  icon={Bot}
                  interactive={true}
                />
                
                <ModernCard
                  title="Application Dashboard"
                  description="Monitor all your job applications with detailed analytics and tracking"
                  delay={0.2}
                  icon={BarChart3}
                  interactive={true}
                />
                
                <ModernCard
                  title="Quick Setup"
                  description="Get started in minutes with our guided setup process"
                  delay={0.3}
                  icon={Zap}
                  interactive={true}
                />
              </div>
            </section>
            
            {/* Technology Showcase */}
            <section className="glass-card rounded-2xl p-8 shadow-soft">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold gradient-text mb-4">
                  Powered by Advanced AI Technology
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Our platform uses the latest AI and automation technologies to deliver exceptional results
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm">
                  <Brain className="h-4 w-4" />
                  Google Gemini AI
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm">
                  <Key className="h-4 w-4" />
                  JWT Security
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm">
                  <Camera className="h-4 w-4" />
                  Playwright Automation
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm">
                  <Mail className="h-4 w-4" />
                  Email Integration
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm">
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp Notifications
                </Badge>
              </div>
            </section>
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
                  className="w-full gradient-primary shadow-soft hover:shadow-medium transition-all duration-200"
                >
                  Start New Application
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Application Form Section */}
        {!applicationStarted && (
          <div className="space-y-8 mt-16">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 glass-card shadow-soft">
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
        )}
      </div>
    </div>
  );
}