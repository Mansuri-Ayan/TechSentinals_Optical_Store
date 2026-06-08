/** @format */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { loginApi, logoutApi, getMeApi } from "../api/auth/auth.api";
import { useAuthStore } from "../store/store";

export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser, clearUser, setLoading } = useAuthStore();

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: async (data) => {
      try {
        setLoading(true);
        // Fetch current user details (cookies sent automatically)
        const userProfile = await getMeApi();
        setUser(userProfile);

        toast.success(`Welcome back, ${userProfile.first_name}!`);

        // Redirect based on role
        if (userProfile.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/shopkeeper", { replace: true });
        }
      } catch (error) {
        toast.error("Failed to retrieve user profile after login.");
        console.error(error);
        clearUser();
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.detail || "Invalid email or password.";
      toast.error(errorMsg);
    },
  });

  // Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: () => {
      // Server reads refresh_token from cookie automatically, body not strictly required
      return logoutApi({});
    },
    onSettled: () => {
      clearUser();
      queryClient.clear();

      navigate("/login", { replace: true });
    },
  });

  // Me Query - runs automatically to verify session on page load/mount
  const useMeQuery = (options = {}) => {
    const { user, isLoading } = useAuthStore();

    // Only run if we are loading initial state, or if we are already logged in
    const shouldFetch = isLoading || !!user;

    return useQuery({
      queryKey: ["auth", "me"],
      queryFn: getMeApi,
      enabled: shouldFetch,
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...options,
    });
  };

  return {
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    useMeQuery,
  };
};
