import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { comprehensiveProfileSchema, type ComprehensiveProfile } from '@shared/schema';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SeamlessFeedback, ProgressSteps } from '@/components/ui/seamless-feedback';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import { 
  Brain, 
  CheckCircle, 
  Clock, 
  Globe, 
  Info,
  Key,
  Mail,
  MessageSquare,
  Upload,
  User,
  MapPin,
  Phone,
  Sparkles
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface EnhancedAutoApplyFormProps {
  jobUrl: string;
  onSuccess?: (sessionId: string) => void;
}

export function EnhancedAutoApplyForm({ jobUrl, onSuccess }: EnhancedAutoApplyFormProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [useRealSubmission, setUseRealSubmission] = useState(true);
  const { toast } = useToast();

  const form = useForm<ComprehensiveProfile>({
    resolver: zodResolver(comprehensiveProfileSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      workAuthorization: 'citizen',
      enableAICoverLetter: true,
      enableWhatsappNotifications: false,
      preferredLoginMethod: 'email',
      loginEmail: '',
      loginPassword: '',
      whatsappNumber: '',
      resumeFileName: '',
      coverLetterFileName: '',
      experience: [],
      customResponses: {}
    },
    mode: 'onChange'
  });

  const enhancedApplyMutation = useMutation({
    mutationFn: async (data: { jobUrl: string; profile: ComprehensiveProfile; resumeFile?: File; coverLetterFile?: File }) => {
      const formData = new FormData();
      formData.append('jobUrl', data.jobUrl);
      formData.append('profile', JSON.stringify(data.profile));
      
      if (data.resumeFile) {
        formData.append('resume', data.resumeFile);
      }
      if (data.coverLetterFile) {
        formData.append('coverLetter', data.coverLetterFile);
      }

      const endpoint = useRealSubmission ? '/api/real-apply' : '/api/enhanced-auto-apply';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Application Submitted Successfully!",
          description: data.message,
        });
        if (data.sessionId && onSuccess) {
          onSuccess(data.sessionId);
        }
      } else {
        // Silent failure - seamless UI approach
        console.error('Application failed:', data.message);
      }
    },
    onError: (error) => {
      // Silent error handling - seamless UI approach
      console.error('Application error:', (error as Error).message);
    }
  });

  const onSubmit = (data: ComprehensiveProfile) => {
    if (!resumeFile) {
      // Seamless feedback instead of error toast - just return silently
      return;
    }

    const finalData = {
      ...data,
      resumeFileName: resumeFile?.name || '',
      coverLetterFileName: coverLetterFile?.name || ''
    };

    enhancedApplyMutation.mutate({
      jobUrl,
      profile: finalData,
      resumeFile: resumeFile || undefined,
      coverLetterFile: coverLetterFile || undefined
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Job Application Form</h1>
        <p className="text-muted-foreground">
          Complete your profile and preferences for automated job applications
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            AI-Powered
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Key className="h-3 w-3" />
            Auto-Login
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            WhatsApp Alerts
          </Badge>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 fade-in-up stagger-1">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 pulse-glow">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Application Features</h3>
            <p className="text-muted-foreground text-sm">
              Auto-login capabilities, AI-generated cover letters, WhatsApp notifications, CAPTCHA detection, and comprehensive application logging.
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Your personal details for job applications</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
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
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Auto-Login Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-orange-600" />
                Auto-Login Credentials (REQUIRED for most jobs)
              </CardTitle>
              <CardDescription>
                <span className="text-orange-600 font-medium">⚠️ Most job platforms require login credentials.</span> Provide your account details for automatic sign-in. All data is encrypted and secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="preferredLoginMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Login Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose login method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email & Password</SelectItem>
                        <SelectItem value="google">Google OAuth</SelectItem>
                        <SelectItem value="linkedin">LinkedIn OAuth</SelectItem>
                        <SelectItem value="manual">Manual (No Auto-Login)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('preferredLoginMethod') !== 'manual' && (
                <>
                  <div className="glass-card rounded-xl p-4 border border-orange-200 bg-orange-50">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-orange-100 border border-orange-200">
                        <Info className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-orange-800">
                          <strong>LOGIN CREDENTIALS REQUIRED:</strong> Google Careers, LinkedIn Jobs, and most company portals require login to submit applications. Please fill out both email and password below.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="loginEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Login Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your-login@email.com" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Same email used for Google/LinkedIn/company accounts
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="loginPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Login Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Your password" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Account password (encrypted and secure)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
              <CardDescription>Location details for job applications</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="New York" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="NY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="10001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workAuthorization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Authorization</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select work authorization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="citizen">U.S. Citizen</SelectItem>
                        <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                        <SelectItem value="visa_required">Visa Required</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Upload
              </CardTitle>
              <CardDescription>Upload your resume and cover letter (if available)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="resume">Resume (Required)</Label>
                <Input
                  id="resume"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="mt-1"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setResumeFile(file);
                      form.setValue('resumeFileName', file.name);
                    }
                  }}
                />
                {resumeFile && (
                  <p className="text-sm text-green-600 mt-1">✅ {resumeFile.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                <Input
                  id="coverLetter"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="mt-1"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverLetterFile(file);
                      form.setValue('coverLetterFileName', file.name);
                    }
                  }}
                />
                {coverLetterFile && (
                  <p className="text-sm text-green-600 mt-1">✅ {coverLetterFile.name}</p>
                )}
              </div>
            </CardContent>
          </Card>



          {/* AI & Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI & Notification Settings
              </CardTitle>
              <CardDescription>Configure AI features and notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="enableAICoverLetter"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Generate AI Cover Letter</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Automatically generate a tailored cover letter using AI based on the job description
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableWhatsappNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable WhatsApp Notifications</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Receive review and confirmation messages via WhatsApp
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('enableWhatsappNotifications') && (
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Include country code (e.g., +1 for US)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch('enableAICoverLetter') && (
                <FormField
                  control={form.control}
                  name="coverLetterTemplate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Letter Style/Template (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your preferred cover letter style or provide a template..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Describe the tone, style, or specific elements you want in your AI-generated cover letter
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-center">
            <Button 
              type="submit"
              size="lg"
              disabled={!resumeFile || enhancedApplyMutation.isPending}
              className="w-full max-w-md gradient-primary shadow-soft hover:shadow-medium transition-all duration-200 interactive-scale"
            >
              {enhancedApplyMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Starting Application Process...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}