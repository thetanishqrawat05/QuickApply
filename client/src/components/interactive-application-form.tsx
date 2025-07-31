import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { comprehensiveProfileSchema } from '@shared/schema';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { 
  CheckCircle, 
  Clock, 
  Globe, 
  Loader2,
  Upload,
  User,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

type ComprehensiveProfile = z.infer<typeof comprehensiveProfileSchema>;

interface InteractiveApplicationFormProps {
  jobUrl: string;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: string) => void;
}

interface SessionStatus {
  sessionId: string;
  status: 'starting' | 'waiting_for_login' | 'ready_to_fill' | 'form_filled' | 'submitted' | 'error';
  message: string;
  requiresLogin: boolean;
  isLoggedIn: boolean;
  canProceed: boolean;
  formFilled: boolean;
  readyToSubmit: boolean;
}

export default function InteractiveApplicationForm({ jobUrl, onSuccess, onError }: InteractiveApplicationFormProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const form = useForm<ComprehensiveProfile>({
    resolver: zodResolver(comprehensiveProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      name: '',
      email: '',
      phone: '',
      countryCode: '+1',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States',
      workAuthorization: 'us_citizen',
      requiresSponsorship: false,
      enableAICoverLetter: true,
      enableWhatsappNotifications: false,
      enableEmailNotifications: true,
      preferredLoginMethod: 'manual',
      resumeFileName: '',
      coverLetterFileName: '',
      skills: [],
      certifications: [],
      languages: [],
      customResponses: {},
      salaryNegotiable: true,
      backgroundCheckConsent: true
    },
    mode: 'onChange'
  });

  // Load saved profile on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('enhancedProfile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        form.reset(profile);
      } catch (error) {
        console.error('Failed to load saved profile:', error);
      }
    }
  }, [form]);

  // Auto-save profile changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      localStorage.setItem('enhancedProfile', JSON.stringify(data));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const startInteractiveSession = async (data: ComprehensiveProfile) => {
    setIsProcessing(true);
    
    try {
      // Validate required files
      if (!resumeFile) {
        toast({
          title: "Resume Required",
          description: "Please upload your resume to continue.",
          variant: "destructive",
        });
        return;
      }

      // Create FormData for submission
      const formData = new FormData();
      formData.append('jobUrl', jobUrl);
      formData.append('profile', JSON.stringify({
        ...data,
        resumeFileName: resumeFile.name,
        coverLetterFileName: coverLetterFile?.name || ''
      }));
      formData.append('resumeFile', resumeFile);
      if (coverLetterFile) {
        formData.append('coverLetterFile', coverLetterFile);
      }

      const response = await fetch('/api/interactive-apply/start', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setSessionStatus({
          sessionId: result.sessionId,
          status: result.requiresLogin ? 'waiting_for_login' : 'ready_to_fill',
          message: result.message,
          requiresLogin: result.requiresLogin,
          isLoggedIn: !result.requiresLogin,
          canProceed: !result.requiresLogin,
          formFilled: false,
          readyToSubmit: false
        });

        if (result.requiresLogin) {
          // Open the job page in a new window for manual login
          window.open(jobUrl, '_blank', 'width=1200,height=800');
          startLoginMonitoring(result.sessionId);
        } else {
          // Ready to fill form directly
          fillApplicationForm(result.sessionId);
        }

        toast({
          title: "Session Started!",
          description: result.message,
        });
      } else {
        toast({
          title: "Failed to Start Session",
          description: result.message,
          variant: "destructive",
        });
        onError?.(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const startLoginMonitoring = (sessionId: string) => {
    const checkLogin = async () => {
      try {
        const response = await fetch(`/api/interactive-apply/check-login/${sessionId}`);
        const result = await response.json();
        
        setSessionStatus(prev => prev ? {
          ...prev,
          isLoggedIn: result.isLoggedIn,
          canProceed: result.canProceed,
          message: result.message,
          status: result.status
        } : null);

        if (result.isLoggedIn && result.canProceed) {
          // User is now logged in, proceed to fill form
          fillApplicationForm(sessionId);
        } else if (!result.isLoggedIn) {
          // Continue monitoring
          setTimeout(checkLogin, 3000);
        }
      } catch (error) {
        console.error('Error checking login status:', error);
        setTimeout(checkLogin, 5000); // Retry with longer delay
      }
    };

    checkLogin();
  };

  const fillApplicationForm = async (sessionId: string) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch(`/api/interactive-apply/fill-form/${sessionId}`, {
        method: 'POST'
      });

      const result = await response.json();

      setSessionStatus(prev => prev ? {
        ...prev,
        formFilled: result.formFilled,
        readyToSubmit: result.readyToSubmit,
        message: result.message,
        status: result.formFilled ? 'form_filled' : 'error'
      } : null);

      if (result.success) {
        toast({
          title: "Form Filled!",
          description: result.message,
        });
        
        // Auto-submit after 5 seconds, or let user submit manually
        setTimeout(() => {
          if (sessionStatus?.readyToSubmit) {
            submitApplication(sessionId);
          }
        }, 5000);
      } else {
        toast({
          title: "Form Filling Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error filling form:', error);
      toast({
        title: "Error",
        description: "Failed to fill application form",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const submitApplication = async (sessionId: string) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch(`/api/interactive-apply/submit/${sessionId}`, {
        method: 'POST'
      });

      const result = await response.json();

      setSessionStatus(prev => prev ? {
        ...prev,
        status: result.submitted ? 'submitted' : 'error',
        message: result.message
      } : null);

      if (result.success) {
        toast({
          title: "Application Submitted!",
          description: result.message,
        });
        onSuccess?.(sessionId);
      } else {
        toast({
          title: "Submission Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onSubmit = (data: ComprehensiveProfile) => {
    startInteractiveSession(data);
  };

  const getStatusIcon = () => {
    if (!sessionStatus) return <User className="w-5 h-5" />;
    
    switch (sessionStatus.status) {
      case 'starting':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'waiting_for_login':
        return <ExternalLink className="w-5 h-5" />;
      case 'ready_to_fill':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'form_filled':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'submitted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  if (sessionStatus) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getStatusIcon()}
              Interactive Application Progress
            </CardTitle>
            <CardDescription>
              {sessionStatus.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{sessionStatus.status}</span>
              </div>
              <Progress 
                value={
                  sessionStatus.status === 'submitted' ? 100 :
                  sessionStatus.status === 'form_filled' ? 75 :
                  sessionStatus.status === 'ready_to_fill' ? 50 :
                  sessionStatus.status === 'waiting_for_login' ? 25 : 10
                } 
              />
            </div>

            {sessionStatus.requiresLogin && !sessionStatus.isLoggedIn && (
              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  Please complete your login in the popup window. I'll automatically detect when you're logged in and proceed with filling the form.
                </AlertDescription>
              </Alert>
            )}

            {sessionStatus.isLoggedIn && !sessionStatus.formFilled && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Great! You're logged in. I'm now filling out the application form automatically...
                </AlertDescription>
              </Alert>
            )}

            {sessionStatus.formFilled && !sessionStatus.readyToSubmit && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Form filled successfully! Preparing for submission...
                </AlertDescription>
              </Alert>
            )}

            {sessionStatus.readyToSubmit && sessionStatus.status !== 'submitted' && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => submitApplication(sessionStatus.sessionId)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application Now"
                  )}
                </Button>
              </div>
            )}

            {sessionStatus.status === 'submitted' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  🎉 Application submitted successfully! You can close this window.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Fill out your profile to start the interactive application process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Resume *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  {resumeFile && (
                    <p className="mt-2 text-sm text-green-600">✓ {resumeFile.name}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cover Letter (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setCoverLetterFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  {coverLetterFile && (
                    <p className="mt-2 text-sm text-green-600">✓ {coverLetterFile.name}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isProcessing || !resumeFile}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting Interactive Session...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" />
                Start Interactive Application
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}