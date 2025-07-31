import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Mail, FileText, User, MapPin, Briefcase, GraduationCap, DollarSign, Clock, CheckCircle } from "lucide-react";
import { ComprehensiveProfile } from "@shared/schema";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FileUpload, { getResumeFile, getCoverLetterFile } from "@/components/file-upload";

interface EnhancedApplicationFormProps {
  jobUrl: string;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: string) => void;
}

export default function EnhancedApplicationForm({ jobUrl, onSuccess, onError }: EnhancedApplicationFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useLocalStorage<Partial<ComprehensiveProfile>>("enhancedProfile", {});
  const { toast } = useToast();

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  const updateProfile = (field: keyof ComprehensiveProfile, value: string | boolean | string[] | Record<string, string> | null) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(Math.min(step + 1, totalSteps));
  const prevStep = () => setStep(Math.max(step - 1, 1));

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!profile.name || !profile.email || !profile.phone) {
        toast({
          title: "Missing Required Information",
          description: "Please fill in your name, email, and phone number.",
          variant: "destructive",
        });
        return;
      }

      const resumeFile = getResumeFile();
      const coverLetterFile = getCoverLetterFile();

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
      formData.append('profile', JSON.stringify(profile));
      formData.append('resume', resumeFile);
      if (coverLetterFile) {
        formData.append('coverLetter', coverLetterFile);
      }

      const response = await fetch('/api/start-application', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Application Started!",
          description: result.message,
        });
        onSuccess?.(result.sessionId);
      } else {
        toast({
          title: "Application Failed",
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    data-testid="input-name"
                    value={profile.name || ""}
                    onChange={(e) => updateProfile('name', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    data-testid="input-email"
                    type="email"
                    value={profile.email || ""}
                    onChange={(e) => updateProfile('email', e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    data-testid="input-phone"
                    value={profile.phone || ""}
                    onChange={(e) => updateProfile('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location & Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  data-testid="input-address"
                  value={profile.address || ""}
                  onChange={(e) => updateProfile('address', e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    data-testid="input-city"
                    value={profile.city || ""}
                    onChange={(e) => updateProfile('city', e.target.value)}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    data-testid="input-state"
                    value={profile.state || ""}
                    onChange={(e) => updateProfile('state', e.target.value)}
                    placeholder="NY"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                  <Input
                    id="zipCode"
                    data-testid="input-zipcode"
                    value={profile.zipCode || ""}
                    onChange={(e) => updateProfile('zipCode', e.target.value)}
                    placeholder="10001"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  data-testid="input-country"
                  value={profile.country || ""}
                  onChange={(e) => updateProfile('country', e.target.value)}
                  placeholder="United States"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Work Authorization & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="workAuth">Work Authorization Status</Label>
                <Select
                  value={profile.workAuthorization || ""}
                  onValueChange={(value) => updateProfile('workAuthorization', value)}
                >
                  <SelectTrigger data-testid="select-work-authorization">
                    <SelectValue placeholder="Select work authorization status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="citizen">US Citizen</SelectItem>
                    <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                    <SelectItem value="visa_required">Visa Required</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {profile.workAuthorization === 'visa_required' && (
                <div>
                  <Label htmlFor="visaStatus">Visa Status Details</Label>
                  <Input
                    id="visaStatus"
                    data-testid="input-visa-status"
                    value={profile.visaStatus || ""}
                    onChange={(e) => updateProfile('visaStatus', e.target.value)}
                    placeholder="H1B, F1-OPT, etc."
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Salary & Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="salary">Desired Salary (Optional)</Label>
                <Input
                  id="salary"
                  data-testid="input-salary"
                  value={profile.desiredSalary || ""}
                  onChange={(e) => updateProfile('desiredSalary', e.target.value)}
                  placeholder="$80,000 - $100,000"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="negotiable"
                  data-testid="checkbox-salary-negotiable"
                  checked={profile.salaryNegotiable || false}
                  onCheckedChange={(checked) => updateProfile('salaryNegotiable', Boolean(checked))}
                />
                <Label htmlFor="negotiable">Salary is negotiable</Label>
              </div>
              <div>
                <Label htmlFor="startDate">Earliest Start Date</Label>
                <Input
                  id="startDate"
                  data-testid="input-start-date"
                  type="date"
                  value={profile.startDate || ""}
                  onChange={(e) => updateProfile('startDate', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents & Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Upload your resume and cover letter. These will be automatically attached to your job applications.
                </AlertDescription>
              </Alert>
              <FileUpload />
            </CardContent>
          </Card>
        );

      case 6:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Review & Submit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <strong>Review Process:</strong> We'll pre-fill the job application form with your information, 
                  then send you an email with all the details for your review. You'll be able to approve 
                  and submit the application directly from the email.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Your Information Summary:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><strong>Name:</strong> {profile.name || "Not provided"}</div>
                  <div><strong>Email:</strong> {profile.email || "Not provided"}</div>
                  <div><strong>Phone:</strong> {profile.phone || "Not provided"}</div>
                  <div><strong>Work Auth:</strong> {profile.workAuthorization || "Not specified"}</div>
                  <div><strong>Salary:</strong> {profile.desiredSalary || "Not specified"}</div>
                  <div><strong>Start Date:</strong> {profile.startDate || "Not specified"}</div>
                </div>
                
                <div className="pt-2">
                  <div><strong>Resume:</strong> {getResumeFile()?.name || "Not uploaded"}</div>
                  <div><strong>Cover Letter:</strong> {getCoverLetterFile()?.name || "Not uploaded"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Enhanced Job Application</h2>
          <span className="text-sm text-gray-500">Step {step} of {totalSteps}</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Job URL Display */}
      <Alert>
        <Briefcase className="h-4 w-4" />
        <AlertDescription>
          <strong>Applying to:</strong> {jobUrl}
        </AlertDescription>
      </Alert>

      {/* Form Step */}
      {renderStep()}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 1}
          data-testid="button-previous"
        >
          Previous
        </Button>
        
        {step < totalSteps ? (
          <Button onClick={nextStep} data-testid="button-next">
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="button-submit"
            className="bg-primary hover:bg-blue-600"
          >
            {isSubmitting ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Starting Application...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Start Application Process
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}