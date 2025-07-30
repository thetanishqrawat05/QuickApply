import { useState } from 'react';
import { ModernHero } from '@/components/ui/modern-hero';
import { ModernCard } from '@/components/ui/modern-card';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';

import { 
  Brain, 
  Key, 
  MessageSquare, 
  Camera, 
  Mail,
  Target,
  Shield,
  Clock,
  LogIn,
  ArrowRight
} from 'lucide-react';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple mock login - in real app, you'd validate credentials
    if (email && password) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      setLocation('/apply');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Modern Hero Section */}
      <ModernHero
        title="Apply to Jobs in Seconds"
        subtitle="AI-Powered Job Applications"
        description="The world's most advanced job application automation tool. Generate AI cover letters, handle secure logins, and get notifications via email and WhatsApp."
        primaryAction={{
          label: "Get Started",
          onClick: () => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })
        }}
        secondaryAction={{
          label: "Demo Secure Login",
          onClick: () => setLocation('/secure-login-demo')
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
              delay={0.1}
              interactive={true}
              className="float-animation"
            >
              <div className="text-center mt-4">
                <div className="text-5xl font-bold gradient-text mb-2">97%</div>
                <p className="text-sm text-muted-foreground">Successfully Submitted</p>
              </div>
            </ModernCard>
            <ModernCard
              title="Time Saved"
              description="Average time saved per application"
              icon={Clock}
              delay={0.2}
              interactive={true}
              className="float-delayed"
            >
              <div className="text-center mt-4">
                <div className="text-5xl font-bold gradient-text mb-2">15<span className="text-2xl">min</span></div>
                <p className="text-sm text-muted-foreground">Average Per Application</p>
              </div>
            </ModernCard>
            <ModernCard
              title="Accuracy"
              description="Form filling accuracy rate"
              icon={Shield}
              delay={0.3}
              interactive={true}
              className="float-slow"
            >
              <div className="text-center mt-4">
                <div className="text-5xl font-bold gradient-text mb-2">99%</div>
                <p className="text-sm text-muted-foreground">Form Filling Accuracy</p>
              </div>
            </ModernCard>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="py-16">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold gradient-text mb-4">
              Powered by Advanced AI Technology
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform uses the latest AI and automation technologies to deliver exceptional results
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm interactive-scale fade-in-up">
              <Brain className="h-4 w-4" />
              Google Gemini AI
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm interactive-scale fade-in-up stagger-1">
              <Key className="h-4 w-4" />
              JWT Security
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm interactive-scale fade-in-up stagger-2">
              <Camera className="h-4 w-4" />
              Playwright Automation
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm interactive-scale fade-in-up stagger-3">
              <Mail className="h-4 w-4" />
              Email Integration
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm interactive-scale fade-in-up stagger-4">
              <MessageSquare className="h-4 w-4" />
              WhatsApp Notifications
            </Badge>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section id="login-section" className="py-16 bg-background/50">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <Card className="glass-card shadow-soft">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  <Logo size="lg" animated={true} />
                </div>
                <CardTitle className="text-2xl gradient-text">Access Your Dashboard</CardTitle>
                <CardDescription>
                  Sign in to start applying to jobs with AI automation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full gradient-primary shadow-soft hover:shadow-medium transition-all duration-200 interactive-scale"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Access Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </form>
                
                <div className="mt-6 p-4 glass-card rounded-xl">
                  <p className="text-sm text-muted-foreground text-center">
                    <strong>Demo Access:</strong> Use any email and password to try the platform
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}