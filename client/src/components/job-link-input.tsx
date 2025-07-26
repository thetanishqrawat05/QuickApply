import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface JobLinkInputProps {
  jobUrl: string;
  onJobUrlChange: (url: string) => void;
  detectedPlatform: string | null;
  onPlatformDetected: (platform: string | null) => void;
}

export default function JobLinkInput({
  jobUrl,
  onJobUrlChange,
  detectedPlatform,
  onPlatformDetected,
}: JobLinkInputProps) {
  const { toast } = useToast();

  const detectPlatformMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/detect-platform", { jobUrl: url });
      return response.json();
    },
    onSuccess: (data) => {
      onPlatformDetected(data.platform);
      if (!data.supported) {
        toast({
          title: "Platform not fully supported",
          description: `${data.platform} detection works, but automation may be limited.`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Detection failed",
        description: "Unable to detect job platform. Please check the URL.",
        variant: "destructive",
      });
      onPlatformDetected(null);
    },
  });

  const handleDetect = () => {
    if (jobUrl) {
      detectPlatformMutation.mutate(jobUrl);
    }
  };

  const handleUrlChange = (url: string) => {
    onJobUrlChange(url);
    onPlatformDetected(null);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Link className="text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Paste Job Link</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="jobLink" className="block text-sm font-medium text-gray-700 mb-2">
              Job Application URL
            </Label>
            <div className="relative">
              <Input
                type="url"
                id="jobLink"
                placeholder="https://boards.greenhouse.io/company/jobs/12345..."
                value={jobUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="pr-20"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={handleDetect}
                disabled={!jobUrl || detectPlatformMutation.isPending}
              >
                {detectPlatformMutation.isPending ? "..." : "Detect"}
              </Button>
            </div>
          </div>
          
          {detectedPlatform && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="text-success w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">Platform detected:</span>
                <Badge variant="outline" className="text-primary border-primary">
                  {detectedPlatform}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
