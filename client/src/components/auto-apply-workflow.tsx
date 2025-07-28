import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { comprehensiveProfileSchema, type ComprehensiveProfile } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Clock, FileText, Mail, CheckCircle, AlertTriangle, Upload, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AutoApplyResult {
  success: boolean;
  sessionId?: string;
  message: string;
  applicationId?: string;
  submissionMethod?: 'manual' | 'auto';
}

export function AutoApplyWorkflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [applicationResult, setApplicationResult] = useState<AutoApplyResult | null>(null);
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
      country: 'United States',
      workAuthorization: 'citizen',
      salaryNegotiable: true,
      education: [],
      experience: [],
      customResponses: {}
    }
  });

  const autoApplyMutation = useMutation({
    mutationFn: async (data: { jobUrl: string; profile: ComprehensiveProfile; resumeFile: File; coverLetterFile?: File }) => {
      const formData = new FormData();
      formData.append('jobUrl', data.jobUrl);
      formData.append('profile', JSON.stringify(data.profile));
      formData.append('resume', data.resumeFile);
      if (data.coverLetterFile) {
        formData.append('coverLetter', data.coverLetterFile);
      }

      const response = await fetch('/api/auto-apply', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start auto-apply workflow');
      }

      return response.json() as Promise<AutoApplyResult>;
    },
    onSuccess: (result) => {
      setApplicationResult(result);
      if (result.success) {
        toast({
          title: "Auto-Apply Started",
          description: "Your application has been prepared and review email sent. Will auto-submit in 60 seconds.",
        });
        setCurrentStep(4);
      } else {
        toast({
          title: "Auto-Apply Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (file: File, type: 'resume' | 'coverLetter') => {
    if (type === 'resume') {
      setResumeFile(file);
      form.setValue('resumeFileName', file.name);
    } else {
      setCoverLetterFile(file);
      form.setValue('coverLetterFileName', file.name);
    }
  };

  const [jobUrl, setJobUrl] = useState('');

  const onSubmit = (data: ComprehensiveProfile) => {
    if (!resumeFile) {
      toast({
        title: "Resume Required",
        description: "Please upload your resume to continue",
        variant: "destructive"
      });
      return;
    }

    if (!jobUrl) {
      toast({
        title: "Job URL Required",
        description: "Please enter a job URL to continue",
        variant: "destructive"
      });
      return;
    }

    autoApplyMutation.mutate({
      jobUrl,
      profile: data,
      resumeFile,
      coverLetterFile: coverLetterFile || undefined
    });
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Globe className="mx-auto h-12 w-12 text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Job Application URL</h2>
        <p className="text-muted-foreground">Enter the job posting URL you want to apply to</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="jobUrl">Job URL</Label>
          <Input
            id="jobUrl"
            type="url"
            placeholder="https://company.com/careers/job-123"
            className="mt-1"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Supports: Greenhouse, Lever, Workday, BambooHR, SmartRecruiters, and company career sites
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Auto-Apply Workflow:</strong>
            <br />• Forms will be auto-filled with your information
            <br />• A review email will be sent to you
            <br />• Application will auto-submit in 60 seconds unless you approve manually
            <br />• You'll receive confirmation regardless of submission method
          </AlertDescription>
        </Alert>
      </div>

      <Button 
        onClick={() => {
          if (!jobUrl) {
            toast({
              title: "Job URL Required",
              description: "Please enter a valid job URL to continue",
              variant: "destructive"
            });
            return;
          }
          setCurrentStep(2);
        }} 
        className="w-full"
        size="lg"
        disabled={!jobUrl}
      >
        Continue to Profile Setup
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileText className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Profile Information</h2>
        <p className="text-muted-foreground">This information will be used to auto-fill application forms</p>
      </div>

      <Form {...form}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="123 Main St" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
        </div>

        <div className="flex gap-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setCurrentStep(1)}
            className="flex-1"
          >
            ← Back to URL
          </Button>
          <Button 
            type="button" 
            onClick={() => {
              const profileValid = form.getValues('name') && form.getValues('email') && form.getValues('phone');
              if (!profileValid) {
                toast({
                  title: "Profile Required",
                  description: "Please fill in name, email, and phone to continue",
                  variant: "destructive"
                });
                return;
              }
              setCurrentStep(3);
            }}
            className="flex-1"
          >
            Continue to Files →
          </Button>
        </div>
      </Form>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="mx-auto h-12 w-12 text-purple-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Upload Documents</h2>
        <p className="text-muted-foreground">Upload your resume and optional cover letter</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="resume">Resume (Required)</Label>
          <Input
            id="resume"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'resume');
            }}
            className="mt-1"
          />
          {resumeFile && (
            <Badge variant="secondary" className="mt-2">
              <FileText className="h-3 w-3 mr-1" />
              {resumeFile.name}
            </Badge>
          )}
        </div>

        <div>
          <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
          <Input
            id="coverLetter"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'coverLetter');
            }}
            className="mt-1"
          />
          {coverLetterFile && (
            <Badge variant="secondary" className="mt-2">
              <FileText className="h-3 w-3 mr-1" />
              {coverLetterFile.name}
            </Badge>
          )}
        </div>
      </div>

      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          <strong>Email Review Process:</strong>
          <br />• Your email will receive a preview of the filled application
          <br />• Click "Approve" to submit immediately, or wait 60 seconds for auto-submit
          <br />• You'll get a confirmation email regardless of how it's submitted
        </AlertDescription>
      </Alert>

      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setCurrentStep(2)}
          className="flex-1"
        >
          ← Back to Profile
        </Button>
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={!resumeFile || autoApplyMutation.isPending}
          className="flex-1"
        >
          {autoApplyMutation.isPending ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Starting Auto-Apply...
            </>
          ) : (
            'Start Auto-Apply Workflow 🚀'
          )}
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        {applicationResult?.success ? (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Auto-Apply Started Successfully!</h2>
          </>
        ) : (
          <>
            <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-red-700 mb-2">Auto-Apply Failed</h2>
          </>
        )}
      </div>

      {applicationResult && (
        <Alert className={applicationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertDescription className="text-center text-lg">
            {applicationResult.message}
          </AlertDescription>
        </Alert>
      )}

      {applicationResult?.success && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-4">What happens next:</h3>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <span>Application form is being auto-filled with your information</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <span>Review email sent to your inbox with filled application preview</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <span>60-second timer started for auto-submission</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
              <span>Confirmation email will be sent after submission</span>
            </div>
          </div>
        </div>
      )}

      <Separator />

      <div className="flex gap-4">
        <Button 
          variant="outline" 
          onClick={() => {
            setCurrentStep(1);
            setApplicationResult(null);
            setResumeFile(null);
            setCoverLetterFile(null);
            setJobUrl('');
            form.reset();
          }}
          className="flex-1"
        >
          🔄 Start New Application
        </Button>
        <Button 
          variant="default"
          onClick={() => window.open('/', '_blank')}
          className="flex-1"
        >
          📊 View Dashboard
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Auto-Apply Workflow</CardTitle>
        <CardDescription className="text-center">
          Automated job application with email approval and 60-second auto-submit timer
        </CardDescription>
        
        {/* Progress indicator */}
        <div className="flex justify-center mt-4">
          <div className="flex items-center">
            {[
              { num: 1, label: 'URL' },
              { num: 2, label: 'Profile' },
              { num: 3, label: 'Files' },
              { num: 4, label: 'Submit' }
            ].map((step, index) => (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.num === currentStep
                        ? 'bg-blue-500 text-white'
                        : step.num < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step.num < currentStep ? <CheckCircle className="h-4 w-4" /> : step.num}
                  </div>
                  <span className="text-xs mt-1 text-gray-500">{step.label}</span>
                </div>
                {index < 3 && <div className={`w-12 h-0.5 mx-2 mt-[-10px] ${step.num < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </CardContent>
    </Card>
  );
}