import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, User, MapPin, Briefcase, GraduationCap, DollarSign, FileText } from "lucide-react";
import { ComprehensiveProfile } from "@shared/schema";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface Experience {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface Education {
  degree: string;
  major: string;
  school: string;
  graduationYear: string;
  gpa: string;
}

export default function ComprehensiveProfileForm() {
  const [profile, setProfile] = useLocalStorage<Partial<ComprehensiveProfile>>("comprehensiveProfile", {});
  const [experience, setExperience] = useState<Experience[]>(profile.experience || []);
  const [education, setEducation] = useState<Education[]>(profile.education || []);

  const updateProfile = (field: keyof ComprehensiveProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const addExperience = () => {
    const newExp: Experience = {
      title: "",
      company: "",
      startDate: "",
      endDate: "",
      current: false,
      description: ""
    };
    const updated = [...experience, newExp];
    setExperience(updated);
    updateProfile('experience', updated);
  };

  const updateExperience = (index: number, field: keyof Experience, value: any) => {
    const updated = experience.map((exp, i) => 
      i === index ? { ...exp, [field]: value } : exp
    );
    setExperience(updated);
    updateProfile('experience', updated);
  };

  const removeExperience = (index: number) => {
    const updated = experience.filter((_, i) => i !== index);
    setExperience(updated);
    updateProfile('experience', updated);
  };

  const addEducation = () => {
    const newEdu: Education = {
      degree: "",
      major: "",
      school: "",
      graduationYear: "",
      gpa: ""
    };
    const updated = [...education, newEdu];
    setEducation(updated);
    updateProfile('education', updated);
  };

  const updateEducation = (index: number, field: keyof Education, value: any) => {
    const updated = education.map((edu, i) => 
      i === index ? { ...edu, [field]: value } : edu
    );
    setEducation(updated);
    updateProfile('education', updated);
  };

  const removeEducation = (index: number) => {
    const updated = education.filter((_, i) => i !== index);
    setEducation(updated);
    updateProfile('education', updated);
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
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
                value={profile.name || ""}
                onChange={(e) => updateProfile('name', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
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
                value={profile.phone || ""}
                onChange={(e) => updateProfile('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address & Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Address & Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
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
                value={profile.city || ""}
                onChange={(e) => updateProfile('city', e.target.value)}
                placeholder="New York"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={profile.state || ""}
                onChange={(e) => updateProfile('state', e.target.value)}
                placeholder="NY"
              />
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={profile.zipCode || ""}
                onChange={(e) => updateProfile('zipCode', e.target.value)}
                placeholder="10001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Authorization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Work Authorization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="workAuth">Work Authorization Status</Label>
            <Select 
              value={profile.workAuthorization || ""} 
              onValueChange={(value) => updateProfile('workAuthorization', value)}
            >
              <SelectTrigger>
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
                value={profile.visaStatus || ""}
                onChange={(e) => updateProfile('visaStatus', e.target.value)}
                placeholder="H1-B, F1-OPT, etc."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary & Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Salary & Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salary">Desired Salary</Label>
              <Input
                id="salary"
                value={profile.desiredSalary || ""}
                onChange={(e) => updateProfile('desiredSalary', e.target.value)}
                placeholder="$80,000 - $100,000"
              />
            </div>
            <div>
              <Label htmlFor="startDate">Available Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={profile.startDate || ""}
                onChange={(e) => updateProfile('startDate', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="negotiable"
              checked={profile.salaryNegotiable || false}
              onCheckedChange={(checked) => updateProfile('salaryNegotiable', checked)}
            />
            <Label htmlFor="negotiable">Salary is negotiable</Label>
          </div>
        </CardContent>
      </Card>

      {/* Work Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Work Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {experience.map((exp, index) => (
            <div key={index} className="border p-4 rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Experience #{index + 1}</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeExperience(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Job Title</Label>
                  <Input
                    value={exp.title}
                    onChange={(e) => updateExperience(index, 'title', e.target.value)}
                    placeholder="Software Engineer"
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input
                    value={exp.company}
                    onChange={(e) => updateExperience(index, 'company', e.target.value)}
                    placeholder="Tech Corp"
                  />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={exp.startDate}
                    onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={exp.endDate}
                    onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                    disabled={exp.current}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`current-${index}`}
                  checked={exp.current}
                  onCheckedChange={(checked) => updateExperience(index, 'current', checked)}
                />
                <Label htmlFor={`current-${index}`}>Currently work here</Label>
              </div>
              <div>
                <Label>Job Description</Label>
                <Textarea
                  value={exp.description}
                  onChange={(e) => updateExperience(index, 'description', e.target.value)}
                  placeholder="Describe your responsibilities and achievements..."
                  rows={3}
                />
              </div>
            </div>
          ))}
          <Button onClick={addExperience} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Work Experience
          </Button>
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Education
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {education.map((edu, index) => (
            <div key={index} className="border p-4 rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Education #{index + 1}</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeEducation(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Degree</Label>
                  <Input
                    value={edu.degree}
                    onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                    placeholder="Bachelor of Science"
                  />
                </div>
                <div>
                  <Label>Major/Field of Study</Label>
                  <Input
                    value={edu.major}
                    onChange={(e) => updateEducation(index, 'major', e.target.value)}
                    placeholder="Computer Science"
                  />
                </div>
                <div>
                  <Label>School/University</Label>
                  <Input
                    value={edu.school}
                    onChange={(e) => updateEducation(index, 'school', e.target.value)}
                    placeholder="University Name"
                  />
                </div>
                <div>
                  <Label>Graduation Year</Label>
                  <Input
                    value={edu.graduationYear}
                    onChange={(e) => updateEducation(index, 'graduationYear', e.target.value)}
                    placeholder="2023"
                  />
                </div>
                <div>
                  <Label>GPA (Optional)</Label>
                  <Input
                    value={edu.gpa}
                    onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                    placeholder="3.8"
                  />
                </div>
              </div>
            </div>
          ))}
          <Button onClick={addEducation} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Education
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}