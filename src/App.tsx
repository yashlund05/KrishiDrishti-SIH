import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RootLayout } from "@/pages/RootLayout"; 

// Page Imports
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Camera from "@/pages/Camera";
import Community from "@/pages/Community";
import Profile from "@/pages/Profile";
import Auth from "@/pages/Auth";
import Info from "@/pages/Info";
import NotFound from "@/pages/NotFound";
import RiskForecast from "@/pages/RiskForecast";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Routes that DON'T have the navigation bar */}
            <Route path="/auth" element={<Auth />} />

            {/* This single ProtectedRoute wraps the main layout */}
            <Route element={<ProtectedRoute><RootLayout /></ProtectedRoute>}>
              {/* All routes inside here will now have the navigation bar */}
              <Route index element={<Dashboard />} />
              <Route path="/info" element={<Info />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/camera" element={<Camera />} />
              <Route path="/community" element={<Community />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/risk-forecast" element={<RiskForecast />} />
            </Route>

            {/* This is the catch-all 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;