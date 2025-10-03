import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MapPin, Calendar, Award, Settings, Bell, LogOut,
  Sprout, TrendingUp, Users, Edit3, Save, Star
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    full_name: "",
    farm_name: "",
    location: "",
    specialization: "",
    established_date: ""
  });

  // Keep all your existing logic for fetching and saving data
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id) // Corrected to use 'id' which is the primary key
          .single();
        if (error && error.code !== "PGRST116") console.error("Error fetching profile:", error);
        if (data) setProfile(data);
      };
      fetchProfile();
    }
  }, [user]);
  
  const achievements = [
    { title: "New Farmer", description: "Welcome to the platform", icon: "🌱" },
    { title: "Profile Creator", description: "Set up your farm profile", icon: "👤" },
    { title: "AI Explorer", description: "Used AI chat for tips", icon: "🤖" },
    { title: "Health Monitor", description: "Scanned first crop", icon: "🔍" }
  ];

  const stats = [
    { label: "Crops Monitored", value: "4", icon: Sprout, color: "text-green-500", bgColor: "bg-green-100" },
    { label: "AI Chats", value: "12", icon: TrendingUp, color: "text-blue-500", bgColor: "bg-blue-100" },
    { label: "Health Scans", value: "8", icon: Users, color: "text-orange-500", bgColor: "bg-orange-100" }
  ];
  
  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Use 'id' to match the primary key for the upsert operation
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: profile.full_name,
        farm_name: profile.farm_name,
        location: profile.location,
        specialization: profile.specialization,
        established_date: profile.established_date || null,
      });

      if (error) throw error;

      setIsEditing(false);
      toast({ title: "Profile updated", description: "Your profile has been successfully updated." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You have been successfully signed out." });
    navigate("/auth");
  };

  const displayName = profile.full_name || user?.email?.split('@')[0] || "Farmer";
  const initials = displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-yellow-50">
      <div className="container mx-auto px-4 py-6 pb-24">
        {/* Profile Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 mb-6 animate-slideInFromTop">
          <div className="flex items-center space-x-6">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white text-3xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">{displayName}</h1>
                  <p className="text-gray-500 font-medium">{profile.farm_name || "Farm Name Not Set"}</p>
                </div>
                <Button
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  disabled={loading}
                  className={`transition-all duration-300 ${isEditing ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
                  {loading ? "Saving..." : isEditing ? "Save Changes" : "Edit Profile"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Form / Details */}
        <div className="grid md:grid-cols-2 gap-6 animate-slideInFromLeft delay-300">
          <div className="space-y-4">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} disabled={!isEditing} placeholder="Your full name"/>
          </div>
          <div className="space-y-4">
            <Label htmlFor="farmName">Farm Name</Label>
            <Input id="farmName" value={profile.farm_name} onChange={(e) => setProfile({...profile, farm_name: e.target.value})} disabled={!isEditing} placeholder="e.g., Green Valley Farms"/>
          </div>
          <div className="space-y-4">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={profile.location} onChange={(e) => setProfile({...profile, location: e.target.value})} disabled={!isEditing} placeholder="e.g., Pune, India"/>
          </div>
          <div className="space-y-4">
            <Label htmlFor="specialization">Specialization</Label>
            <Input id="specialization" value={profile.specialization} onChange={(e) => setProfile({...profile, specialization: e.target.value})} disabled={!isEditing} placeholder="e.g., Organic Vegetables"/>
          </div>
          <div className="space-y-4">
            <Label htmlFor="established">Date Established</Label>
            <Input id="established" type="date" value={profile.established_date} onChange={(e) => setProfile({...profile, established_date: e.target.value})} disabled={!isEditing} />
          </div>
          <div className="space-y-4">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={user?.email || ""} disabled className="cursor-not-allowed opacity-60"/>
          </div>
        </div>

        {/* Farm Statistics */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm rounded-3xl my-6 animate-slideInFromRight delay-600">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-800">📊 Farm Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className={`p-4 rounded-xl flex items-center gap-4 ${stat.bgColor}`}>
                  <div className={`text-2xl ${stat.color}`}><stat.icon className="w-8 h-8" /></div>
                  <div>
                    <div className="text-3xl font-bold text-gray-700">{stat.value}</div>
                    <div className="text-sm font-medium text-gray-500">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm rounded-3xl mb-6 animate-slideInFromBottom delay-900">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-2xl font-bold text-gray-800">
              <Award className="w-7 h-7 text-yellow-500" /><span>Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 rounded-xl bg-gray-50 border">
                  <div className="text-4xl">{achievement.icon}</div>
                  <div>
                    <h4 className="font-semibold text-gray-700">{achievement.title}</h4>
                    <p className="text-sm text-gray-500">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings & Actions */}
        <div className="space-y-3 animate-slideInFromBottom delay-1200">
            <Button variant="outline" className="w-full justify-start p-6 text-base bg-white hover:bg-gray-50"><Settings className="w-5 h-5 mr-3" />Account Settings</Button>
            <Button variant="outline" className="w-full justify-start p-6 text-base bg-white hover:bg-gray-50"><Bell className="w-5 h-5 mr-3" />Notification Preferences</Button>
            <Button variant="destructive" className="w-full justify-start p-6 text-base bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200" onClick={handleLogout}><LogOut className="w-5 h-5 mr-3" />Sign Out</Button>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Profile;