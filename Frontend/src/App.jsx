/** @format */

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppRouter from "./routes/AppRouter";
import { useAuth } from "./hooks/useAuth";
import { useAuthStore } from "./store/store";

// Initialize the TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function AuthHydration({ children }) {
  const { useMeQuery, logout } = useAuth();
  const { setUser, setLoading } = useAuthStore();
  const { data: userProfile, isError, isLoading } = useMeQuery();

  // Listen to global logout events (e.g. from Axios 401 refresh failures)
  useEffect(() => {
    const handleLogoutEvent = () => {
      logout();
    };
    window.addEventListener("auth:logout", handleLogoutEvent);
    return () => window.removeEventListener("auth:logout", handleLogoutEvent);
  }, [logout]);

  // Synchronize query result with Zustand store
  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      return;
    }

    if (userProfile) {
      setUser(userProfile);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [userProfile, isError, isLoading, setUser, setLoading]);

  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthHydration>
          <div className="App">
            <AppRouter />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              theme="dark"
            />
          </div>
        </AuthHydration>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
