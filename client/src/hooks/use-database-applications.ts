import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, JobApplicationRecord, InsertUserType } from "@shared/schema";

export function useDatabaseApplications(userEmail?: string) {
  const queryClient = useQueryClient();

  // Get user by email
  const userQuery = useQuery({
    queryKey: ['/api/users', userEmail],
    enabled: !!userEmail,
    retry: false,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: InsertUserType) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
  });

  // Get applications for user
  const applicationsQuery = useQuery({
    queryKey: ['/api/users', userQuery.data?.id, 'applications'],
    enabled: !!userQuery.data?.id,
  });

  const user = userQuery.data as User | undefined;
  const applications = applicationsQuery.data as JobApplicationRecord[] | undefined;

  return {
    user,
    applications: applications || [],
    isLoadingUser: userQuery.isLoading,
    isLoadingApplications: applicationsQuery.isLoading,
    createUser: createUserMutation.mutate,
    refetchApplications: applicationsQuery.refetch,
  };
}