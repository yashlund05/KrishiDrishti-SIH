import { Outlet } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Toaster } from "@/components/ui/toaster";

export const RootLayout = () => {
  return (
    // This container fills the screen and arranges the page and navigation vertically
    <div className="h-screen bg-gray-50 flex flex-col">
      
      {/* This main area grows to fill the space above the navigation */}
      <main className="flex-1 overflow-y-auto">
        {/* Your pages (Dashboard, Community, etc.) will be rendered here */}
        <Outlet /> 
      </main>

      {/* The navigation bar stays fixed at the bottom */}
      <Navigation />

      {/* This is needed for pop-up notifications */}
      <Toaster />
    </div>
  );
};