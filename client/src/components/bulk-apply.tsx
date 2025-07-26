import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Users, Play, Pause, RotateCcw, CheckCircle, X, Clock } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useBulkApplicationAutomation } from "@/hooks/use-bulk-application-automation";
import { Profile } from "@shared/schema";

export default function BulkApply() {
  const [jobUrls, setJobUrls] = useState("");
  const [profile] = useLocalStorage<Profile>("jobApplierProfile", {
    name: "",
    email: "",
    phone: "",
  });
  const [resumeFile] = useLocalStorage<File | null>("resumeFile", null);
  const [coverLetterFile] = useLocalStorage<File | null>("coverLetterFile", null);
  
  const { 
    bulkApply, 
    isBulkApplying, 
    progress, 
    pauseBulkApply, 
    resumeBulkApply,
    retryFailed 
  } = useBulkApplicationAutomation();

  const handleBulkApply = async () => {
    const urls = jobUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url && url.startsWith('http'));

    if (urls.length === 0) {
      return;
    }

    if (!profile.name || !profile.email || !profile.phone || !resumeFile) {
      return;
    }

    await bulkApply({
      jobUrls: urls,
      profile,
      resumeFile,
      coverLetterFile: coverLetterFile || undefined,
    });
  };

  const urlCount = jobUrls
    .split('\n')
    .map(url => url.trim())
    .filter(url => url && url.startsWith('http')).length;

  const isProfileComplete = profile.name && profile.email && profile.phone;
  const canBulkApply = urlCount > 0 && isProfileComplete && resumeFile && !isBulkApplying;

  const progressPercentage = progress ? 
    Math.round((progress.completedJobs / progress.totalJobs) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Users className="text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Bulk Apply</h2>
          <Badge variant="outline" className="text-primary border-primary">
            Up to 50 jobs
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="bulkJobUrls" className="block text-sm font-medium text-gray-700 mb-2">
              Job URLs (one per line)
            </Label>
            <Textarea
              id="bulkJobUrls"
              placeholder="https://boards.greenhouse.io/company/jobs/12345
https://jobs.lever.co/company/job-id
https://company.wd1.myworkdayjobs.com/job..."
              value={jobUrls}
              onChange={(e) => setJobUrls(e.target.value)}
              className="min-h-[120px]"
              disabled={isBulkApplying}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-500">
                {urlCount} valid URL{urlCount !== 1 ? 's' : ''} detected
              </span>
              <span className="text-xs text-gray-400">
                Max 50 jobs per batch
              </span>
            </div>
          </div>

          {/* Progress Section */}
          {progress && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Application Progress</h3>
                <Badge variant={progress.isComplete ? "default" : "secondary"}>
                  {progress.completedJobs}/{progress.totalJobs}
                </Badge>
              </div>
              
              <Progress value={progressPercentage} className="mb-3" />
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Success: {progress.successfulJobs}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <X className="w-3 h-3 text-red-500" />
                  <span>Failed: {progress.failedJobs}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span>Pending: {progress.totalJobs - progress.completedJobs}</span>
                </div>
              </div>

              {progress.currentJobUrl && !progress.isComplete && (
                <div className="mt-3 text-xs text-gray-600">
                  Currently processing: {progress.currentJobUrl}
                </div>
              )}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex space-x-2">
            {!isBulkApplying ? (
              <Button 
                onClick={handleBulkApply}
                disabled={!canBulkApply}
                className="flex-1 bg-primary hover:bg-blue-600"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Bulk Apply
              </Button>
            ) : (
              <>
                <Button
                  onClick={pauseBulkApply}
                  variant="outline"
                  className="flex-1"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button
                  onClick={resumeBulkApply}
                  className="flex-1 bg-primary hover:bg-blue-600"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              </>
            )}
            
            {progress && progress.failedJobs > 0 && (
              <Button
                onClick={retryFailed}
                variant="outline"
                disabled={isBulkApplying}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Failed ({progress.failedJobs})
              </Button>
            )}
          </div>

          {/* Requirements Check */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isProfileComplete ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Profile complete</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${resumeFile ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Resume uploaded</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${urlCount > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Job URLs provided</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}