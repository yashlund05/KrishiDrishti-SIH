import { Home, Users, Camera, MessageSquare, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: "dashboard", icon: Home, label: "Home", path: "/" },
    { id: "community", icon: Users, label: "Community", path: "/community" },
    { id: "camera", icon: Camera, label: "Camera", path: "/camera" },
    { id: "forecast", icon: Shield, label: "Forecast", path: "/risk-forecast" },
    { id: "chat", icon: MessageSquare, label: "AI Chat", path: "/chat" },
    { id: "profile", icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto py-2 px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-green-100 text-green-600"
                  : "text-gray-400 hover:text-green-600" // <-- The hyphen is removed from this line
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};