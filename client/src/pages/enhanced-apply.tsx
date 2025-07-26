import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bot, ExternalLink, CheckCircle, Clock, Mail } from "lucide-react";
import { Link } from "wouter";
import JobLinkInput from "@/components/job-link-input";
import EnhancedApplicationForm from "@/components/enhanced-application-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EnhancedApply() {
  const [jobUrl, setJobUrl] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'idle' | 'started' | 'email-sent' | 'completed'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleJobUrlSubmit = () => {
    if (jobUrl && detectedPlatform) {
      setShowForm(true);
    }
  };

  const handleApplicationSuccess = (id: string) => {
    setSessionId(id);
    setApplicationStatus('email-sent');
  };

  const handleApplicationError = (error: string) => {
    console.error('Application error:', error);
    setApplicationStatus('idle');
  };

  const renderStatusAlert = () => {
    switch (applicationStatus) {
      case 'email-sent':
        return (
          <Alert className="border-green-200 bg-green-50">
            <Mail className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Email Sent!</strong> Check your inbox for the application review email. 
              Click "Approve & Submit" in the email to complete your application.
            </AlertDescription>
          </Alert>
        );
      case 'completed':
        return (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Application Submitted!</strong> Your job application has been successfully submitted. 
              You should receive a confirmation email shortly.
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="ml-6 flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Bot className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Enhanced Auto Apply</h1>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Beta</Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Alert */}
        {renderStatusAlert()}

        {!showForm ? (
          <div className="space-y-6">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-6 h-6 text-primary" />
                  Enhanced Job Application Process
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Our enhanced process collects all your information upfront, pre-fills the job application form, 
                    and sends you an email for review before submitting. This ensures accuracy and gives you 
                    complete control over your applications.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-white font-bold">1</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">Complete Profile</h3>
                      <p className="text-sm text-gray-600 mt-1">Fill out comprehensive information once</p>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">Auto Pre-Fill</h3>
                      <p className="text-sm text-gray-600 mt-1">We pre-fill the job application form</p>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-white font-bold">3</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">Email Review</h3>
                      <p className="text-sm text-gray-600 mt-1">Review and approve via email</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job URL Input */}
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Enter Job URL</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <JobLinkInput
                  jobUrl={jobUrl}
                  onJobUrlChange={setJobUrl}
                  detectedPlatform={detectedPlatform}
                  onPlatformDetected={setDetectedPlatform}
                />
                
                {jobUrl && detectedPlatform && (
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-medium">
                        Platform detected: {detectedPlatform}
                      </span>
                    </div>
                    <Button onClick={handleJobUrlSubmit} data-testid="button-continue">
                      Continue
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <EnhancedApplicationForm
            jobUrl={jobUrl}
            onSuccess={handleApplicationSuccess}
            onError={handleApplicationError}
          />
        )}
      </div>
    </div>
  );
}