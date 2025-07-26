import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ApplicationHistoryItem, Profile, BulkApplyProgress } from "@shared/schema";

// Browser-compatible UUID generation
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

interface BulkApplyParams {
  jobUrls: string[];
  profile: Profile;
  resumeFile: File;
  coverLetterFile?: File;
}

export function useBulkApplicationAutomation() {
  const { toast } = useToast();
  const [history, setHistory] = useLocalStorage<ApplicationHistoryItem[]>("applicationHistory", []);
  const [progress, setProgress] = useState<BulkApplyProgress | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [failedJobs, setFailedJobs] = useState<string[]>([]);

  // Single job application function
  const applyToSingleJob = useCallback(async (
    jobUrl: string, 
    profile: Profile, 
    resumeFile: File, 
    coverLetterFile?: File
  ) => {
    const formData = new FormData();
    formData.append('jobUrl', jobUrl);
    formData.append('profile', JSON.stringify(profile));
    formData.append('resume', resumeFile);
    if (coverLetterFile) {
      formData.append('coverLetter', coverLetterFile);
    }

    const response = await fetch('/api/apply-job', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to apply to job');
    }

    return response.json();
  }, []);

  const bulkApply = useCallback(async ({ jobUrls, profile, resumeFile, coverLetterFile }: BulkApplyParams) => {
    setIsApplying(true);
    const results = [];
    setProgress({
      totalJobs: jobUrls.length,
      completedJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      currentJobUrl: undefined,
      isComplete: false,
    });

    try {
      for (let i = 0; i < jobUrls.length; i++) {
        // Check if paused
        if (isPaused) {
          break;
        }

        const jobUrl = jobUrls[i];
        setProgress(prev => prev ? {
          ...prev,
          currentJobUrl: jobUrl,
        } : null);

        try {
          const result = await applyToSingleJob(jobUrl, profile, resumeFile, coverLetterFile);
          
          // Add to history
          const applicationRecord: ApplicationHistoryItem = {
            id: generateId(),
            jobUrl,
            platform: 'Auto-detected',
            status: result.success ? 'applied' : 'failed',
            appliedAt: new Date().toISOString(),
            errorMessage: result.success ? undefined : result.message,
            retryCount: 0,
            submissionConfirmed: result.submissionConfirmed || false,
          };

          setHistory(prev => [applicationRecord, ...prev]);
          results.push({ jobUrl, success: result.success, result });

          // Update progress
          setProgress(prev => prev ? {
            ...prev,
            completedJobs: prev.completedJobs + 1,
            successfulJobs: result.success ? prev.successfulJobs + 1 : prev.successfulJobs,
            failedJobs: result.success ? prev.failedJobs : prev.failedJobs + 1,
          } : null);

          // Add failed job to retry list
          if (!result.success) {
            setFailedJobs(prev => [...prev, jobUrl]);
          }

        } catch (error) {
          const applicationRecord: ApplicationHistoryItem = {
            id: generateId(),
            jobUrl,
            platform: 'Unknown',
            status: 'failed',
            appliedAt: new Date().toISOString(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            retryCount: 0,
            submissionConfirmed: false,
          };

          setHistory(prev => [applicationRecord, ...prev]);
          results.push({ jobUrl, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          setFailedJobs(prev => [...prev, jobUrl]);

          setProgress(prev => prev ? {
            ...prev,
            completedJobs: prev.completedJobs + 1,
            failedJobs: prev.failedJobs + 1,
          } : null);
        }

        // Add delay between applications to avoid being blocked
        if (i < jobUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        }
      }

      // Mark as complete
      setProgress(prev => prev ? {
        ...prev,
        currentJobUrl: undefined,
        isComplete: true,
      } : null);

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      toast({
        title: "Bulk application complete",
        description: `Applied to ${successful} jobs successfully. ${failed} applications failed.`,
      });

    } catch (error) {
      toast({
        title: "Bulk application failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during bulk application",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  }, [applyToSingleJob, isPaused, setHistory, toast]);

  const pauseBulkApply = useCallback(() => {
    setIsPaused(true);
    toast({
      title: "Bulk application paused",
      description: "You can resume the process anytime.",
    });
  }, [toast]);

  const resumeBulkApply = useCallback(() => {
    setIsPaused(false);
    toast({
      title: "Bulk application resumed",
      description: "Continuing with the remaining applications.",
    });
  }, [toast]);

  const retryFailed = useCallback(async () => {
    if (failedJobs.length === 0) return;

    const profile = JSON.parse(localStorage.getItem("jobApplierProfile") || "{}");
    const resumeFileData = localStorage.getItem("resumeFile");
    const coverLetterFileData = localStorage.getItem("coverLetterFile");

    if (!resumeFileData) {
      toast({
        title: "Resume required",
        description: "Please upload your resume before retrying failed applications.",
        variant: "destructive",
      });
      return;
    }

    // Reset failed jobs list and retry
    const jobsToRetry = [...failedJobs];
    setFailedJobs([]);
    
    bulkApplyMutation.mutate({
      jobUrls: jobsToRetry,
      profile,
      resumeFile: JSON.parse(resumeFileData),
      coverLetterFile: coverLetterFileData ? JSON.parse(coverLetterFileData) : undefined,
    });
  }, [failedJobs, bulkApplyMutation, toast]);

  return {
    bulkApply,
    isBulkApplying: isApplying && !isPaused,
    progress,
    pauseBulkApply,
    resumeBulkApply,
    retryFailed,
    failedJobsCount: failedJobs.length,
  };
}