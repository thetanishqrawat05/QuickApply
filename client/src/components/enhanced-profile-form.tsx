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
  Loader2,
  FileText,
  Wand2,
  AlertCircle
} from 'lucide-react';

type ComprehensiveProfile = z.infer<typeof comprehensiveProfileSchema>;

interface EnhancedProfileFormProps {
  jobUrl: string;
  onSuccess?: (sessionId: string) => void;
}

// Country codes for international phone numbers
const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+852', country: 'Hong Kong', flag: '🇭🇰' }
];

export function EnhancedProfileForm({ jobUrl, onSuccess }: EnhancedProfileFormProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [savedProfileEmail, setSavedProfileEmail] = useState<string>('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isAnalyzingResume, setIsAnalyzingResume] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showProfileSaveSuccess, setShowProfileSaveSuccess] = useState(false);
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
      loginEmail: '',
      loginPassword: '',
      whatsappNumber: '',
      resumeFileName: '',
      coverLetterFileName: '',
      customResponses: {}
    },
    mode: 'onChange'
  });

  // Auto-save profile on key field changes (without showing notifications)
  const autoSaveProfile = useMutation({
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
      setSavedProfileEmail(form.getValues('email'));
      setProfileLoaded(true);
      // Silent save - no notification
    },
    onError: () => {
      // Silent failure - no notification for auto-save
    }
  });

  // Manual save profile (with success notification)
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
      setShowProfileSaveSuccess(true);
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

  // Resume analysis mutation
  const analyzeResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await fetch('/api/analyze-resume', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze resume');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      // Auto-fill form with extracted data
      if (result.extractedProfile) {
        Object.entries(result.extractedProfile).forEach(([key, value]) => {
          if (value && key in form.getValues()) {
            form.setValue(key as keyof ComprehensiveProfile, value as any);
          }
        });
      }
      toast({
        title: "Resume Analyzed Successfully",
        description: `Extracted ${Object.keys(result.extractedProfile || {}).length} fields with ${result.confidence}% confidence.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
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
        if (response.status === 404) return null;
        throw new Error('Failed to load profile');
      }
      return response.json();
    },
    enabled: !!savedProfileEmail,
  });

  // Auto-load profile when email is entered
  useEffect(() => {
    const emailValue = form.watch('email');
    if (emailValue && emailValue.includes('@') && emailValue !== savedProfileEmail) {
      setSavedProfileEmail(emailValue);
    }
  }, [form.watch('email')]);

  // Load saved profile data into form
  useEffect(() => {
    if (savedProfile && !profileLoaded) {
      Object.entries(savedProfile).forEach(([key, value]) => {
        if (value !== null && value !== undefined && key in form.getValues()) {
          form.setValue(key as keyof ComprehensiveProfile, value as any);
        }
      });
      setProfileLoaded(true);
      toast({
        title: "Profile Loaded",
        description: "Your saved profile has been loaded successfully.",
      });
    }
  }, [savedProfile, profileLoaded]);

  // Auto-save on important field changes (silent)
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      const importantFields = ['email', 'firstName', 'lastName', 'phone', 'address', 'city', 'state'];
      if (name && importantFields.includes(name) && value.email && value.firstName && value.lastName) {
        // Debounce auto-save
        const timer = setTimeout(() => {
          autoSaveProfile.mutate(value as ComprehensiveProfile);
        }, 2000);
        return () => clearTimeout(timer);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const handleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setResumeFile(file);
      form.setValue('resumeFileName', file.name);
      
      // Automatically analyze resume
      setIsAnalyzingResume(true);
      analyzeResumeMutation.mutate(file);
      setIsAnalyzingResume(false);
    }
  };

  const handleCoverLetterUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCoverLetterFile(file);
      form.setValue('coverLetterFileName', file.name);
    }
  };

  // Submit application mutation
  const submitApplicationMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/auto-apply', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Application submission failed');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Application Started Successfully",
        description: "Your job application is being processed. You'll receive email notifications with updates.",
      });
      
      if (onSuccess && result.sessionId) {
        onSuccess(result.sessionId);
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

  const onSubmit = async (data: ComprehensiveProfile) => {
    if (!resumeFile) {
      toast({
        title: "Resume Required",
        description: "Please upload your resume before starting the application.",
        variant: "destructive"
      });
      return;
    }

    if (!jobUrl) {
      toast({
        title: "Job URL Required", 
        description: "Please provide a valid job URL.",
        variant: "destructive"
      });
      return;
    }

    // Show profile save success only on final submission
    if (!showProfileSaveSuccess) {
      await saveProfileMutation.mutateAsync(data);
    }

    const formData = new FormData();
    formData.append('jobUrl', jobUrl);
    formData.append('profile', JSON.stringify(data));
    
    if (resumeFile) {
      formData.append('resume', resumeFile);
    }
    
    if (coverLetterFile) {
      formData.append('coverLetter', coverLetterFile);
    }

    submitApplicationMutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Enhanced Profile & Application</span>
          </CardTitle>
          <CardDescription>
            Complete your profile to start applying for jobs with AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="professional">Professional</TabsTrigger>
                  <TabsTrigger value="education">Education</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                  <TabsTrigger value="files">Files & AI</TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4">
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

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Enhanced Phone Number with Country Code */}
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <div className="flex space-x-2">
                      <FormField
                        control={form.control}
                        name="countryCode"
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Code" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COUNTRY_CODES.map((country) => (
                                    <SelectItem key={country.code} value={country.code}>
                                      {country.flag} {country.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address *</FormLabel>
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
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input placeholder="San Francisco" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <FormControl>
                            <Input placeholder="CA" {...field} />
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
                            <Input placeholder="94105" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="United States">United States</SelectItem>
                                <SelectItem value="Canada">Canada</SelectItem>
                                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                                <SelectItem value="Germany">Germany</SelectItem>
                                <SelectItem value="France">France</SelectItem>
                                <SelectItem value="Australia">Australia</SelectItem>
                                <SelectItem value="India">India</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Professional Tab */}
                <TabsContent value="professional" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currentTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Job Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Software Engineer" {...field} />
                          </FormControl>
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
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="yearsOfExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years of Experience</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select experience level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0-1 years">0-1 years</SelectItem>
                              <SelectItem value="1-3 years">1-3 years</SelectItem>
                              <SelectItem value="3-5 years">3-5 years</SelectItem>
                              <SelectItem value="5-7 years">5-7 years</SelectItem>
                              <SelectItem value="7-10 years">7-10 years</SelectItem>
                              <SelectItem value="10+ years">10+ years</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workAuthorization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Authorization</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select work authorization" />
                            </SelectTrigger>
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
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label>Requires Sponsorship</Label>
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
                              I require visa sponsorship to work in this country
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Education Tab */}
                <TabsContent value="education" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="highestDegree"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Highest Degree</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select degree" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high_school">High School</SelectItem>
                                <SelectItem value="associates">Associate's Degree</SelectItem>
                                <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                                <SelectItem value="masters">Master's Degree</SelectItem>
                                <SelectItem value="phd">PhD</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="university"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>University</FormLabel>
                          <FormControl>
                            <Input placeholder="Stanford University" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="major"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Major/Field of Study</FormLabel>
                          <FormControl>
                            <Input placeholder="Computer Science" {...field} />
                          </FormControl>
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
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Preferences Tab */}
                <TabsContent value="preferences" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>AI Cover Letter Generation</Label>
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
                                Generate personalized cover letters using AI
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email Notifications</Label>
                      <FormField
                        control={form.control}
                        name="enableEmailNotifications"
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
                                Receive email notifications about application status
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>WhatsApp Notifications</Label>
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
                                Receive WhatsApp notifications (requires phone number)
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Files & AI Tab */}
                <TabsContent value="files" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Resume Upload *</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleResumeUpload}
                          className="hidden"
                          id="resume-upload"
                        />
                        <label htmlFor="resume-upload" className="cursor-pointer">
                          <div className="space-y-2">
                            <Upload className="w-8 h-8 mx-auto text-gray-400" />
                            <div className="text-sm">
                              {resumeFile ? (
                                <span className="text-green-600 font-medium">
                                  {resumeFile.name}
                                </span>
                              ) : (
                                <>
                                  <span className="font-medium">Click to upload your resume</span>
                                  <br />
                                  <span className="text-gray-500">PDF, DOC, or DOCX files</span>
                                </>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                      
                      {isAnalyzingResume && (
                        <div className="flex items-center space-x-2 text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Analyzing resume with AI...</span>
                        </div>
                      )}
                      
                      {analysisResult && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Brain className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-900">AI Analysis Complete</span>
                          </div>
                          <p className="text-sm text-blue-700 mb-2">
                            Extracted {Object.keys(analysisResult.extractedProfile || {}).length} fields 
                            with {analysisResult.confidence}% confidence
                          </p>
                          {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                            <div className="text-xs text-blue-600">
                              <strong>Suggestions:</strong>
                              <ul className="list-disc list-inside mt-1">
                                {analysisResult.suggestions.map((suggestion: string, index: number) => (
                                  <li key={index}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Cover Letter (Optional)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleCoverLetterUpload}
                          className="hidden"
                          id="cover-letter-upload"
                        />
                        <label htmlFor="cover-letter-upload" className="cursor-pointer">
                          <div className="space-y-2">
                            <FileText className="w-8 h-8 mx-auto text-gray-400" />
                            <div className="text-sm">
                              {coverLetterFile ? (
                                <span className="text-green-600 font-medium">
                                  {coverLetterFile.name}
                                </span>
                              ) : (
                                <>
                                  <span className="font-medium">Click to upload cover letter</span>
                                  <br />
                                  <span className="text-gray-500">PDF, DOC, or DOCX files (optional)</span>
                                </>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {form.watch('enableAICoverLetter') && !coverLetterFile && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <Wand2 className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-purple-900">AI Cover Letter Enabled</span>
                        </div>
                        <p className="text-sm text-purple-700 mt-1">
                          A personalized cover letter will be generated using AI based on the job description and your profile.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveProfileMutation.mutate(form.getValues())}
                    disabled={saveProfileMutation.isPending}
                    className="interactive-scale"
                  >
                    {saveProfileMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Profile
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={submitApplicationMutation.isPending || !resumeFile}
                  className="gradient-button interactive-scale"
                >
                  {submitApplicationMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Start Application
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}