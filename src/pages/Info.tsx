import React, { useState, useEffect } from "react";
import { Sprout, MapPin, Calendar, Ruler, Plus, Trash2, CheckCircle, AlertCircle, Users, Award, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User as SupabaseUser } from "@supabase/supabase-js";

const Info = () => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    farm_name: "",
    location: { city: null as string | null, latitude: null as number | null, longitude: null as number | null },
    specialization: "",
    established_date: "",
    farmSize: "",
    crops: [{ name: "" }],
  });

  const indianCrops = [
    "Rice", "Wheat", "Sugarcane", "Cotton", "Maize", "Pulses (e.g., Lentils, Chickpeas)",
    "Tea", "Coffee", "Spices (e.g., Turmeric, Pepper)", "Tomato", "Potato", "Onion",
    "Millet", "Soybean", "Groundnut"
  ];

  const formSteps = [
    { title: "Personal Details", icon: Users, fields: ["full_name", "farm_name"], description: "Tell us about yourself and your farm" },
    { title: "Location & Size", icon: MapPin, fields: ["location", "farmSize"], description: "Where is your farm located and how big is it?" },
    { title: "Farm Details", icon: Calendar, fields: ["specialization", "established_date"], description: "What's your farming focus and experience?" },
    { title: "Crop Selection", icon: Sprout, fields: ["crops"], description: "What crops do you grow?" }
  ];

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast({ title: "Error", description: "Please log in first.", variant: "destructive" });
        navigate("/auth");
        return;
      }
      setUser(user);
    };
    getUser();
  }, [navigate, toast]);

  const getCityFromCoordinates = async (latitude: number, longitude: number) => {
    // Access the API key securely from environment variables
    const apiKey = import.meta.env.VITE_OPENCAGE_API_KEY;
    if (!apiKey) {
      toast({ title: "Configuration Error", description: "Geocoding API key is missing.", variant: "destructive" });
      return "Config Error";
    }
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?key=${apiKey}&q=${latitude}+${longitude}&pretty=1&limit=1`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].components.city || data.results[0].components.town || "Unknown Location";
      }
      return "Unknown Location";
    } catch (error: any) {
      toast({ title: "Geocoding Error", description: error.message, variant: "destructive" });
      return "API Error";
    }
  };

  const requestLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const city = await getCityFromCoordinates(latitude, longitude);
          setFormData((prev) => ({
            ...prev,
            location: { city, latitude, longitude },
          }));
          toast({ title: "Success", description: `Location set to ${city}` });
        },
        (error) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
      );
    } else {
      toast({ title: "Error", description: "Geolocation not supported", variant: "destructive" });
    }
  };

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCrops = [...formData.crops];
    newCrops[index].name = e.target.value;
    setFormData({ ...formData, crops: newCrops });
  };

  const addCrop = () => {
    setFormData((prev) => ({
      ...prev,
      crops: [...prev.crops, { name: "" }],
    }));
  };

  const removeCrop = (index: number) => {
    const newCrops = formData.crops.filter((_, i) => i !== index);
    setFormData({ ...formData, crops: newCrops });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = (stepIndex: number) => {
    const step = formSteps[stepIndex];
    return step.fields.every(field => {
      if (field === "location") return formData.location.city;
      if (field === "crops") return formData.crops.every(crop => crop.name);
      // @ts-ignore
      return formData[field];
    });
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      if (currentStep < formSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep) || !user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("farm_details").upsert({
        user_id: user.id,
        full_name: formData.full_name,
        farm_name: formData.farm_name,
        location: formData.location.city,
        specialization: formData.specialization,
        established_date: formData.established_date || null,
        farm_size: parseFloat(formData.farmSize) || 0,
        latitude: formData.location.latitude,
        longitude: formData.location.longitude,
        crop_specialization: JSON.stringify(formData.crops.map(crop => crop.name).filter(name => name)),
      }, { onConflict: "user_id" });

      if (error) throw error;

      toast({ title: "Success", description: "Farm profile created successfully!" });
      navigate("/"); // Navigate to dashboard after success
    } catch (error: any) {
      toast({ title: "Submission Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 animate-slideInFromRight">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" /> Full Name
              </label>
              <input name="full_name" type="text" value={formData.full_name} onChange={handleChange} placeholder="Enter your full name" required className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300 bg-white/50 backdrop-blur-sm" />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Award className="w-4 h-4 text-green-600" /> Farm Name
              </label>
              <input name="farm_name" type="text" value={formData.farm_name} onChange={handleChange} placeholder="e.g., Green Valley Farm" required className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300 bg-white/50 backdrop-blur-sm" />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6 animate-slideInFromRight">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" /> Farm Location
              </label>
              <button type="button" onClick={requestLocationPermission} className={`w-full p-4 rounded-2xl border-2 border-dashed transition-all duration-300 ${formData.location.city ? "border-green-400 bg-green-50 text-green-700" : "border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-700"} flex items-center justify-center gap-3 group`}>
                <MapPin className={`w-5 h-5 ${formData.location.city ? 'text-green-600' : 'text-blue-600'} group-hover:scale-110 transition-transform duration-300`} />
                {formData.location.city ? `Location: ${formData.location.city}` : "Grant Location Access"}
              </button>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-orange-600" /> Farm Size (acres)
              </label>
              <input name="farmSize" type="number" value={formData.farmSize} onChange={handleChange} placeholder="Enter size in acres" required min="0" className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-white/50 backdrop-blur-sm" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-slideInFromRight">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600" /> Specialization
              </label>
              <input name="specialization" type="text" value={formData.specialization} onChange={handleChange} placeholder="e.g., Organic Vegetables" required className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 bg-white/50 backdrop-blur-sm" />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" /> Date Established
              </label>
              <input name="established_date" type="date" value={formData.established_date} onChange={handleChange} required className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-300 bg-white/50 backdrop-blur-sm" />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-slideInFromRight">
            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Sprout className="w-4 h-4 text-green-600" /> Crop Specializations
              </label>
              {formData.crops.map((crop, index) => (
                <div key={index} className="flex items-center gap-3 animate-slideInFromLeft" style={{ animationDelay: `${index * 100}ms` }}>
                  <select value={crop.name} onChange={(e) => handleInputChange(index, e)} required className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300 bg-white/50 backdrop-blur-sm">
                    <option value="">Select crop</option>
                    {indianCrops.map((cropOption) => (<option key={cropOption} value={cropOption}>{cropOption}</option>))}
                  </select>
                  <button type="button" onClick={() => removeCrop(index)} disabled={formData.crops.length <= 1} className="w-12 h-12 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-110 flex items-center justify-center group">
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addCrop} className="w-full p-4 rounded-2xl border-2 border-dashed border-green-400 bg-green-50 hover:bg-green-100 text-green-700 transition-all duration-300 flex items-center justify-center gap-3 group">
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                Add Another Crop
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-yellow-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute opacity-5" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${i * 2}s` }}>
            <div className="animate-float text-8xl">{["📋", "🌱", "📍", "📊", "🚜", "🏡"][i]}</div>
          </div>
        ))}
      </div>
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8 animate-slideInFromTop">
             <h1 className="text-4xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Setup Your Farm Profile
            </h1>
            <p className="text-gray-600 text-lg max-w-md mx-auto">
              Help us personalize your farming experience with AI-powered insights
            </p>
          </div>
          <div className="mb-8 animate-slideInFromLeft delay-300">
            <div className="flex justify-between items-center relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full -translate-y-1/2">
                <div className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all duration-700" style={{ width: `${(currentStep / (formSteps.length - 1)) * 100}%` }} />
              </div>
              {formSteps.map((step, index) => (
                <div key={index} className="relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${completedSteps.includes(index) ? "bg-green-500 border-green-500 text-white scale-110" : currentStep === index ? "bg-blue-500 border-blue-500 text-white scale-110 shadow-lg" : "bg-white border-gray-300 text-gray-400"}`}>
                    {completedSteps.includes(index) ? <CheckCircle className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border-0 overflow-hidden animate-slideInFromBottom delay-600">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  {React.createElement(formSteps[currentStep].icon, { className: "w-6 h-6 text-white" })}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{formSteps[currentStep].title}</h2>
                  <p className="text-white/80 text-sm">{formSteps[currentStep].description}</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="mb-8">{renderStepContent()}</div>
              <div className="flex gap-4">
                {currentStep > 0 && (<button type="button" onClick={prevStep} className="flex-1 py-4 px-6 rounded-2xl border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 font-semibold transition-all duration-300 transform hover:scale-105">Previous</button>)}
                {currentStep < formSteps.length - 1 ? (
                  <button type="button" onClick={nextStep} disabled={!validateStep(currentStep)} className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group">
                    <div className="flex items-center justify-center gap-2">Continue <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" /></div>
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={!validateStep(currentStep) || loading} className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group">
                    {loading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting up your profile...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">Complete Setup <Zap className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" /></div>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Info;