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
      // Save tokens
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      try {
        setLoading(true);
        // Fetch current user details
        const userProfile = await getMeApi();
        setUser(userProfile);

        toast.success(`Welcome back, ${userProfile.full_name}!`);

        // Redirect based on role
        if (userProfile.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } catch (error) {
        toast.error("Failed to retrieve user profile after login.");
        console.log(error);
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
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        return logoutApi({ refresh_token: refreshToken });
      }
      return Promise.resolve();
    },
    onSettled: () => {
      clearUser();
      queryClient.clear();
      toast.success("Successfully logged out.");
      navigate("/login", { replace: true });
    },
  });

  // Me Query - runs automatically if access_token is present in localStorage
  const useMeQuery = (options = {}) => {
    const token = localStorage.getItem("access_token");

    return useQuery({
      queryKey: ["auth", "me"],
      queryFn: getMeApi,
      enabled: !!token,
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
