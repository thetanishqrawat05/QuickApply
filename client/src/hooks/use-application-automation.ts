import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ApplicationHistoryItem, Profile } from "@shared/schema";

// Browser-compatible UUID generation
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

interface ApplyJobParams {
  jobUrl: string;
  profile: Profile;
  resumeFile: File;
  coverLetterFile?: File;
}

export function useApplicationAutomation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [history, setHistory] = useLocalStorage<ApplicationHistoryItem[]>("applicationHistory", []);

  const applyMutation = useMutation({
    mutationFn: async ({ jobUrl, profile, resumeFile, coverLetterFile }: ApplyJobParams) => {
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
    },
    onMutate: async ({ jobUrl }) => {
      // Add optimistic update to history
      const tempApplication: ApplicationHistoryItem = {
        id: generateId(),
        jobUrl,
        platform: 'Detecting...',
        status: 'needs_review',
        appliedAt: new Date().toISOString(),
      };

      setHistory(prev => [tempApplication, ...prev]);
      
      toast({
        title: "Starting application",
        description: "Processing your job application...",
      });

      return { tempApplication };
    },
    onSuccess: (data, { jobUrl }, context) => {
      // Update history with actual result
      setHistory(prev => 
        prev.map(app => 
          app.id === context?.tempApplication.id
            ? {
                ...app,
                status: data.success ? 'applied' as const : 'failed' as const,
                errorMessage: data.success ? undefined : data.message,
              }
            : app
        )
      );

      if (data.success) {
        toast({
          title: "Application submitted!",
          description: "Your job application has been submitted successfully.",
        });
      } else {
        toast({
          title: "Application failed",
          description: data.message || "Failed to submit application",
          variant: "destructive",
        });
      }
    },
    onError: (error, { jobUrl }, context) => {
      // Update history with error
      setHistory(prev => 
        prev.map(app => 
          app.id === context?.tempApplication.id
            ? {
                ...app,
                status: 'failed' as const,
                errorMessage: error.message,
              }
            : app
        )
      );

      toast({
        title: "Application failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  return {
    applyToJob: applyMutation.mutate,
    isApplying: applyMutation.isPending,
  };
}
