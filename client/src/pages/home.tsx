import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Settings, Bot } from "lucide-react";
import { Link } from "wouter";
import JobLinkInput from "@/components/job-link-input";
import ProfileForm from "@/components/profile-form";
import FileUpload, { getResumeFile, getCoverLetterFile } from "@/components/file-upload";
import ApplicationHistory from "@/components/application-history";
import ApplicationStats from "@/components/application-stats";
// import BulkApply from "@/components/bulk-apply";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useApplicationAutomation } from "@/hooks/use-application-automation";
import { Profile } from "@shared/schema";

export default function Home() {
  const [jobUrl, setJobUrl] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [profile] = useLocalStorage<Profile>("jobApplierProfile", {
    name: "",
    email: "",
    phone: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(getResumeFile());
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(getCoverLetterFile());
  
  const { applyToJob, isApplying } = useApplicationAutomation();

  // Update file state when global files change
  useEffect(() => {
    const updateFiles = () => {
      setResumeFile(getResumeFile());
      setCoverLetterFile(getCoverLetterFile());
    };
    
    const interval = setInterval(updateFiles, 100); // Poll for file changes
    return () => clearInterval(interval);
  }, []);

  const handleApplyNow = async () => {
    if (!jobUrl || !profile.name || !profile.email || !profile.phone || !resumeFile) {
      return;
    }

    await applyToJob({
      jobUrl,
      profile,
      resumeFile,
      coverLetterFile: coverLetterFile || undefined,
    });
  };

  const isProfileComplete = profile.name && profile.email && profile.phone;
  const canApply = jobUrl && detectedPlatform && isProfileComplete && resumeFile;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Bot className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Auto Job Applier</h1>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Free</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/enhanced-apply">
                <Button variant="outline" size="sm" data-testid="button-enhanced-apply">
                  Enhanced Apply
                </Button>
              </Link>
              <Button variant="ghost" size="sm">
                <HelpCircle className="text-gray-500 text-lg" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="text-gray-500 text-lg" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Application Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Link Input */}
            <JobLinkInput
              jobUrl={jobUrl}
              onJobUrlChange={setJobUrl}
              detectedPlatform={detectedPlatform}
              onPlatformDetected={setDetectedPlatform}
            />

            {/* Quick Apply Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Bot className="text-primary" />
                    <h2 className="text-lg font-semibold text-gray-900">Quick Apply</h2>
                  </div>
                  <Button 
                    onClick={handleApplyNow}
                    disabled={!canApply || isApplying}
                    className="bg-primary hover:bg-blue-600"
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    {isApplying ? "Applying..." : "Apply Now"}
                  </Button>
                </div>
                
                {/* Application Preview */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Application Preview</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{profile.name || "Not set"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{profile.email || "Not set"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{profile.phone || "Not set"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Resume:</span>
                      <span className={`font-medium ${resumeFile ? "text-success" : "text-gray-500"}`}>
                        {resumeFile ? "✓ Uploaded" : "Not uploaded"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Apply - Coming Soon */}
            {/* <BulkApply /> */}

            {/* Application History */}
            <ApplicationHistory />
          </div>

          {/* Profile Sidebar */}
          <div className="space-y-6">
            {/* Profile Setup */}
            <ProfileForm />

            {/* File Uploads */}
            <FileUpload />

            {/* Application Stats */}
            <ApplicationStats />
          </div>
        </div>
      </div>
    </div>
  );
}
