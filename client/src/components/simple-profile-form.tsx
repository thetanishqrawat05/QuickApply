import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, User, Mail, Phone, Sparkles, Loader2 } from 'lucide-react';

interface SimpleProfileFormProps {
  jobUrl: string;
  onSuccess?: (sessionId: string) => void;
}

export function SimpleProfileForm({ jobUrl, onSuccess }: SimpleProfileFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Submit application mutation
  const submitApplication = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/auto-apply', {
        method: 'POST',
        body: data,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Application submission failed');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      setIsSubmitting(false);
      toast({
        title: "Application Started Successfully",
        description: "Your job application is being processed. You'll receive email notifications with updates.",
      });
      
      if (onSuccess && result.sessionId) {
        onSuccess(result.sessionId);
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: "Application Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, DOC, or DOCX file.",
          variant: "destructive"
        });
        return;
      }
      setResumeFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resumeFile) {
      toast({
        title: "Resume Required",
        description: "Please upload your resume before starting the application.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in your name and email address.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    const submissionData = new FormData();
    submissionData.append('jobUrl', jobUrl);
    submissionData.append('profile', JSON.stringify({
      ...formData,
      name: `${formData.firstName} ${formData.lastName}`,
      countryCode: '+1',
      country: 'United States',
      workAuthorization: 'us_citizen',
      requiresSponsorship: false,
      enableEmailNotifications: true,
      enableAICoverLetter: true,
      preferredLoginMethod: 'manual'
    }));
    submissionData.append('resume', resumeFile);

    submitApplication.mutate(submissionData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Quick Job Application</span>
          </CardTitle>
          <CardDescription>
            Fill out your basic information and upload your resume to start applying
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="john.doe@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="San Francisco"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="CA"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume">Resume Upload *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  id="resume"
                  type="file"
                  onChange={handleResumeUpload}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                />
                <Label htmlFor="resume" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    {resumeFile ? (
                      <span className="text-green-600">✓ {resumeFile.name}</span>
                    ) : (
                      <>
                        <span className="font-medium">Click to upload resume</span>
                        <div className="text-xs mt-1">PDF, DOC, or DOCX files only</div>
                      </>
                    )}
                  </div>
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !resumeFile}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Application...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Application
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}