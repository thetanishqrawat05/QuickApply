import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { comprehensiveProfileSchema } from '@shared/schema';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
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
  Sparkles,
  Save,
  Database,
  Loader2
} from 'lucide-react';

type ComprehensiveProfile = z.infer<typeof comprehensiveProfileSchema>;

interface ComprehensiveProfileFormProps {
  jobUrl: string;
  onSuccess?: (sessionId: string) => void;
}

export function ComprehensiveProfileForm({ jobUrl, onSuccess }: ComprehensiveProfileFormProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [savedProfileEmail, setSavedProfileEmail] = useState<string>('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ComprehensiveProfile>({
    resolver: zodResolver(comprehensiveProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      name: '',
      email: '',
      phone: '',
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
      loginEmail: '',
      loginPassword: '',
      whatsappNumber: '',
      resumeFileName: '',
      coverLetterFileName: '',
      customResponses: {}
    },
    mode: 'onChange'
  });

  // Mutation to save profile to database
  const saveProfileMutation = useMutation({
    mutationFn: async (profileData: ComprehensiveProfile) => {
      const response = await fetch('/api/profile/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save profile');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Saved",
        description: "Your profile has been saved successfully and will be automatically loaded for future applications.",
      });
      setSavedProfileEmail(form.getValues('email'));
      setProfileLoaded(true);
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Query to load profile from database
  const { data: savedProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', savedProfileEmail],
    queryFn: async () => {
      if (!savedProfileEmail) return null;
      const response = await fetch(`/api/profile/load/${encodeURIComponent(savedProfileEmail)}`);
      if (!response.ok) {
        if (response.status === 404) return null; // Profile not found is OK
        throw new Error('Failed to load profile');
      }
      return response.json();
    },
    enabled: !!savedProfileEmail && !profileLoaded,
  });

  // Auto-save profile whenever form data changes (debounced)
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.email && value.firstName && value.lastName) {
        // Auto-save after user fills basic info
        const timeoutId = setTimeout(() => {
          saveProfileMutation.mutate(value as ComprehensiveProfile);
        }, 2000); // Debounce for 2 seconds

        return () => clearTimeout(timeoutId);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, saveProfileMutation]);

  // Load profile when email is entered and we find saved data
  useEffect(() => {
    const emailValue = form.watch('email');
    if (emailValue && emailValue !== savedProfileEmail && !profileLoaded) {
      setSavedProfileEmail(emailValue);
    }
  }, [form.watch('email'), savedProfileEmail, profileLoaded]);

  // Auto-fill form when profile is loaded
  useEffect(() => {
    if (savedProfile && !profileLoaded) {
      form.reset(savedProfile);
      setProfileLoaded(true);
      toast({
        title: "Profile Loaded",
        description: "Your saved profile has been automatically loaded!",
      });
    }
  }, [savedProfile, form, profileLoaded, toast]);

  const applyMutation = useMutation({
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

      const response = await fetch('/api/real-apply', {
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
          description: data.message || "Your job application has been processed.",
        });
        if (data.sessionId && onSuccess) {
          onSuccess(data.sessionId);
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Application Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Manual save profile function
  const handleSaveProfile = () => {
    const currentData = form.getValues();
    if (!currentData.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to save your profile.",
        variant: "destructive"
      });
      return;
    }
    saveProfileMutation.mutate(currentData as ComprehensiveProfile);
  };

  const onSubmit = (data: ComprehensiveProfile) => {
    // Auto-save profile before submitting
    if (data.email) {
      saveProfileMutation.mutate(data);
    }

    if (!resumeFile) {
      toast({
        title: "Resume Required",
        description: "Please upload your resume to continue.",
        variant: "destructive"
      });
      return;
    }

    // Combine first and last name for full name if not provided
    if (!data.name && data.firstName && data.lastName) {
      data.name = `${data.firstName} ${data.lastName}`;
    }

    applyMutation.mutate({
      jobUrl,
      profile: data,
      resumeFile: resumeFile || undefined,
      coverLetterFile: coverLetterFile || undefined
    });
  };

  const handleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setResumeFile(file);
      form.setValue('resumeFileName', file.name);
    }
  };

  const handleCoverLetterUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCoverLetterFile(file);
      form.setValue('coverLetterFileName', file.name);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Complete Your Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Fill out all fields once and we'll save your profile for future applications
        </p>
        
        {/* Profile Status Indicator */}
        <div className="flex items-center justify-center gap-4">
          {profileLoaded && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-sm">
              <Database className="h-4 w-4" />
              Profile Loaded
            </div>
          )}
          
          {isLoadingProfile && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Profile...
            </div>
          )}
          
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleSaveProfile}
            disabled={saveProfileMutation.isPending || !form.watch('email')}
            className="flex items-center gap-2"
          >
            {saveProfileMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Profile
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Basic contact information (required for all applications)
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main Street" {...field} />
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
                        <FormLabel>City *</FormLabel>
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
                        <FormLabel>State *</FormLabel>
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
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkedinProfile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn Profile</FormLabel>
                        <FormControl>
                          <Input placeholder="linkedin.com/in/your-profile" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Professional Information Tab */}
            <TabsContent value="professional" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Work Authorization</CardTitle>
                  <CardDescription>
                    Employment eligibility (required by most employers)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="workAuthorization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Authorization Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select work authorization" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="us_citizen">US Citizen</SelectItem>
                            <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                            <SelectItem value="h1b">H1B Visa</SelectItem>
                            <SelectItem value="opt">OPT</SelectItem>
                            <SelectItem value="cpt">CPT</SelectItem>
                            <SelectItem value="ead">EAD</SelectItem>
                            <SelectItem value="tn">TN Visa</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiresSponsorship"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I require visa sponsorship
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Experience & Salary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="yearsOfExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years of Experience</FormLabel>
                        <FormControl>
                          <Input placeholder="5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Software Engineer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Tech Corp" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="desiredSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desired Salary</FormLabel>
                        <FormControl>
                          <Input placeholder="$120,000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Education Background</CardTitle>
                  <CardDescription>
                    Education information (required by most employers)
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="highestDegree"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Highest Degree</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select degree" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="high_school">High School</SelectItem>
                            <SelectItem value="associates">Associate's</SelectItem>
                            <SelectItem value="bachelors">Bachelor's</SelectItem>
                            <SelectItem value="masters">Master's</SelectItem>
                            <SelectItem value="phd">PhD</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="university"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>University/School</FormLabel>
                        <FormControl>
                          <Input placeholder="University of California" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="major"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Major/Field of Study</FormLabel>
                        <FormControl>
                          <Input placeholder="Computer Science" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="graduationYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Graduation Year</FormLabel>
                        <FormControl>
                          <Input placeholder="2020" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gpa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GPA (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="3.8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI & Automation Settings
                  </CardTitle>
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
                          <FormLabel>
                            Generate AI cover letters
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Automatically create tailored cover letters for each application
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
                          <FormLabel>
                            WhatsApp notifications
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Get instant notifications on WhatsApp
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Custom Responses</CardTitle>
                  <CardDescription>
                    Common answers for application questions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="whyInterested"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Why are you interested in this role?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="I am passionate about..." 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additionalInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Information</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any additional information you'd like to share..." 
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Required Documents
                  </CardTitle>
                  <CardDescription>
                    Upload your resume and cover letter (resume is required)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="resume-upload">Resume (Required) *</Label>
                    <Input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      className="cursor-pointer"
                    />
                    {resumeFile && (
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {resumeFile.name} uploaded successfully
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cover-letter-upload">Cover Letter (Optional)</Label>
                    <Input
                      id="cover-letter-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCoverLetterUpload}
                      className="cursor-pointer"
                    />
                    {coverLetterFile && (
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {coverLetterFile.name} uploaded successfully
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="text-sm text-muted-foreground">
              <Clock className="inline h-4 w-4 mr-1" />
              Applications process in ~5 seconds
            </div>
            
            <Button 
              type="submit" 
              disabled={applyMutation.isPending || !resumeFile}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {applyMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing Application...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Auto-Apply Process
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}