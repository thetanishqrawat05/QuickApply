import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Briefcase,
  GraduationCap,
  DollarSign,
  FileText,
  Settings,
  AlertCircle,
  Save
} from 'lucide-react';

type ComprehensiveProfile = z.infer<typeof comprehensiveProfileSchema>;

interface ComprehensiveProfileFormProps {
  jobUrl: string;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: string) => void;
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
  { code: '+7', country: 'Russia', flag: '🇷🇺' }
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function ComprehensiveProfileForm({ jobUrl, onSuccess, onError }: ComprehensiveProfileFormProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState('personal');
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
      whatsappNumber: '',
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

  // Auto-save profile changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      localStorage.setItem('comprehensiveProfile', JSON.stringify(data));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Load saved profile on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('comprehensiveProfile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        form.reset(profile);
      } catch (error) {
        console.error('Failed to load saved profile:', error);
      }
    }
  }, [form]);

  const handleSubmit = async (data: ComprehensiveProfile) => {
    setIsSubmitting(true);
    
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
        toast({
          title: "Interactive Session Started!",
          description: result.requiresLogin ? 
            "Job page opened for manual login. Please complete login, then I'll fill the form automatically." :
            "Ready to fill application form automatically.",
        });
        
        if (result.requiresLogin) {
          // Open job page in new window for manual login
          window.open(jobUrl, '_blank', 'width=1200,height=800');
        }
        
        onSuccess?.(result.sessionId);
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
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'contact', label: 'Contact Details', icon: Phone },
    { id: 'work', label: 'Work & Experience', icon: Briefcase },
    { id: 'files', label: 'Files & Submission', icon: FileText }
  ];

  const getTabProgress = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
    return ((currentIndex + 1) / tabs.length) * 100;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Globe className="w-6 h-6" />
            Comprehensive Job Application Profile
          </CardTitle>
          <CardDescription>
            Complete your detailed profile for professional job applications. All major companies require these details.
          </CardDescription>
          <Progress value={getTabProgress()} className="mt-4" />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Tabs value={currentTab} onValueChange={setCurrentTab}>
                <TabsList className="grid grid-cols-4 w-full">
                  {tabs.map((tab) => (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id}
                      className="flex items-center gap-1 text-xs"
                    >
                      <tab.icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Personal Info Tab */}
                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
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
                          <Input placeholder="John Michael Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="workAuthorization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Authorization *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select authorization" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="us_citizen">US Citizen</SelectItem>
                              <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                              <SelectItem value="h1b">H1B Visa</SelectItem>
                              <SelectItem value="opt">F1-OPT</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Contact Details Tab */}
                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main Street, Apt 4B" {...field} />
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {US_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="United States" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="linkedinProfile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn Profile</FormLabel>
                          <FormControl>
                            <Input placeholder="https://linkedin.com/in/johndoe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://johndoe.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Work & Experience Tab */}
                <TabsContent value="work" className="space-y-4">
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
                            <Input placeholder="Tech Corp Inc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="yearsOfExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of Experience</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select experience" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0-1">0-1 years</SelectItem>
                              <SelectItem value="1-3">1-3 years</SelectItem>
                              <SelectItem value="3-5">3-5 years</SelectItem>
                              <SelectItem value="5-10">5-10 years</SelectItem>
                              <SelectItem value="10+">10+ years</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="noticePeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notice Period</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select notice period" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="immediate">Immediate</SelectItem>
                              <SelectItem value="2-weeks">2 weeks</SelectItem>
                              <SelectItem value="1-month">1 month</SelectItem>
                              <SelectItem value="2-months">2 months</SelectItem>
                              <SelectItem value="3-months">3+ months</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name="requiresSponsorship"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Requires visa sponsorship
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name="willingToRelocate"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Willing to relocate
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Files Tab */}
                <TabsContent value="files" className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Resume * (PDF, DOC, DOCX)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mt-2">
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

                    <div>
                      <Label>Cover Letter (Optional - PDF, DOC, DOCX)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mt-2">
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

                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Your profile will be saved automatically and used for all future applications.
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Navigation and Submit */}
              <div className="flex flex-col space-y-4 pt-6 border-t">
                <div className="flex flex-wrap gap-2 justify-center">
                  {tabs.map((tab, index) => (
                    <Button
                      key={tab.id}
                      type="button"
                      variant={currentTab === tab.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentTab(tab.id)}
                      className="flex items-center gap-1"
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </Button>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !resumeFile}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Starting Interactive Session...
                      </>
                    ) : (
                      <>
                        <Globe className="w-5 h-5 mr-2" />
                        Start Interactive Application
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}