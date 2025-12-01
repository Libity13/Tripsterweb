import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AppProvider } from "@/context/AppContext";
import { serviceManager } from "@/services/enhancedServices";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import TripPlanner from "./pages/TripPlanner";
import MyTrips from "./pages/MyTrips";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Disabled to save quota - uncomment only when debugging
// import { testSupabaseConnection } from "./utils/testSupabase";
// import { testEdgeFunctionsAnonymous } from "./utils/testEdgeFunctionsAnonymous";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize services
    serviceManager.initializeAll();
    
    // Test Supabase connection on app start (DEV only)
    // ⚠️ DISABLED: These tests consume quota - uncomment only when debugging
    // if (import.meta.env.DEV) {
    //   testSupabaseConnection();
    //   testEdgeFunctionsAnonymous();
    // }
    
    // Cleanup on unmount
    return () => {
      serviceManager.cleanupAll();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <AppProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Auth Callback needs to be at root to handle OAuth redirects correctly */}
                <Route path="/auth/callback" element={<AuthCallback />} />
                
                {/* Language Routes */}
                <Route path="/:lang" element={<Outlet />}>
                  <Route index element={<Index />} />
                  <Route path="chat" element={<Chat />} />
                  <Route path="trips" element={<MyTrips />} />
                  <Route path="trip/:id" element={<TripPlanner />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Redirect root to default language (th) */}
                <Route path="/" element={<Navigate to="/th" replace />} />
                
                {/* Catch all - redirect to default language */}
                <Route path="*" element={<Navigate to="/th" replace />} />
              </Routes>
            </TooltipProvider>
          </AppProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
