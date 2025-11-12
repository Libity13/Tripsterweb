import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AppProvider } from "@/context/AppContext";
import { serviceManager } from "@/services/enhancedServices";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import TripPlanner from "./pages/TripPlanner";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import { testSupabaseConnection } from "./utils/testSupabase";
import { testEdgeFunctionsAnonymous } from "./utils/testEdgeFunctionsAnonymous";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize services
    serviceManager.initializeAll();
    
    // Test Supabase connection on app start (DEV only)
    if (import.meta.env.DEV) {
      testSupabaseConnection();
      testEdgeFunctionsAnonymous();
    }
    
    // Cleanup on unmount
    return () => {
      serviceManager.cleanupAll();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/trip/:id" element={<TripPlanner />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </AppProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
