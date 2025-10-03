import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Sprout, Phone, User, Lock, ArrowRight, Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignup, setIsSignup] = useState(true);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event, session);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) navigate("/info");
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) navigate("/info");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const formatPhone = (inputPhone: string): string => {
    let formatted = inputPhone;
    if (!inputPhone.startsWith('+') && inputPhone.length === 10 && inputPhone.match(/^\d{10}$/)) {
      formatted = '+91' + inputPhone;
    } else if (!inputPhone.startsWith('+')) {
      formatted = '+91' + inputPhone;
    }
    return formatted;
  };

  const handleSignUpOrLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formattedPhone = formatPhone(phone);

      if (!formattedPhone.match(/^\+\d{10,15}$/)) {
        toast({ title: "Error", description: "Please enter a valid phone number (e.g., 84465931 becomes +9184465931)", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error, data } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          data: isSignup ? { full_name: fullName } : {},
        },
      });
      console.log("SignIn response:", data, error);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setShowOtpForm(true);
        toast({ title: "OTP Sent", description: "Check your phone for the code." });
      }
    } catch (error) {
      console.error("SignIn error:", error);
      toast({ title: "Error", description: "Unexpected issue occurred.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpDigits.join("").length < 6) return;

    setLoading(true);
    try {
      const formattedPhone = formatPhone(phone);
      console.log("Verifying OTP with phone:", formattedPhone, "token:", otp);
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,  // Use formatted phone consistently
        token: otp,
        type: isSignup ? "signup" : "sms",
      });
      console.log("Verify response:", { data, error });

      if (error) {
        let errorMsg = error.message;
        if (errorMsg.includes("expired") || errorMsg.includes("invalid")) {
          errorMsg = "OTP expired or invalid. Please request a new one.";
        }
        toast({ title: "Invalid OTP", description: errorMsg, variant: "destructive" });
      } else {
        toast({ title: "Welcome!", description: "Redirecting to info...", });
        navigate("/info");
      }
    } catch (error) {
      console.error("Verify error:", error);
      toast({ title: "Error", description: "Verification failed. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const formattedPhone = formatPhone(phone);
      const { error } = await supabase.auth.resend({
        type: isSignup ? "signup" : "sms",
        phone: formattedPhone,
      });
      console.log("Resend response:", error);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "OTP Resent", description: "Check your phone for a new code." });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to resend OTP.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`);
      nextInput?.focus();
    }

    setOtp(newDigits.join(""));
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevInput = document.querySelector(`input[name="otp-${index - 1}"]`);
      prevInput?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-yellow-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-5"
            style={{
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animationDelay: i * 3 + "s"
            }}
          >
            <div className="animate-float text-8xl">
              {["🌾", "🌱", "🌿", "🍃", "🌻", "🌳", "🚜", "🏡"][i]}
            </div>
          </div>
        ))}
      </div>

      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-slideInFromTop">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-white transform transition-all duration-500 hover:scale-110 hover:rotate-12">
                <Sprout className="w-10 h-10 text-white animate-pulse" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-bounce"></div>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Welcome to Farm AI
            </h1>
            <p className="text-gray-600 text-lg">
              {showOtpForm ? "Enter the code sent to your phone" : "Your smart farming companion awaits"}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border-0 p-8 transform transition-all duration-700 animate-slideInFromBottom">
            {!showOtpForm ? (
              <div>
                <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
                  <button
                    onClick={() => setIsSignup(true)}
                    className={"flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 " + 
                      (isSignup 
                        ? "bg-white shadow-lg text-green-600 transform scale-105" 
                        : "text-gray-600 hover:text-green-600"
                      )}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <User className="w-4 h-4" />
                      Sign Up
                    </div>
                  </button>
                  <button
                    onClick={() => setIsSignup(false)}
                    className={"flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 " + 
                      (!isSignup 
                        ? "bg-white shadow-lg text-green-600 transform scale-105" 
                        : "text-gray-600 hover:text-green-600"
                      )}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" />
                      Log In
                    </div>
                  </button>
                </div>

                <div className="space-y-6">
                  {isSignup && (
                    <div className="space-y-2 animate-slideInFromLeft">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-green-600" />
                        Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                      />
                    </div>
                  )}

                  <div className={"space-y-2 animate-slideInFromRight " + (isSignup ? "delay-300" : "")}>
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-green-600" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone (e.g., 84465931)"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleSignUpOrLogin}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group animate-slideInFromBottom delay-600"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending OTP...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        Send Verification Code
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    )}
                  </Button>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 animate-slideInFromBottom delay-900">
                  <div className="text-center p-3 bg-green-50 rounded-xl">
                    <div className="text-2xl mb-2">🌱</div>
                    <p className="text-xs text-green-600 font-medium">Smart Monitoring</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <div className="text-2xl mb-2">📊</div>
                    <p className="text-xs text-blue-600 font-medium">Real-time Analytics</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-slideInFromRight">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Verify Your Phone</h3>
                  <p className="text-gray-600">We sent a 6-digit code to</p>
                  <p className="font-semibold text-green-600">{phone}</p>
                </div>

                <div className="flex justify-center gap-3 mb-8">
                  {otpDigits.map((digit, index) => (
                    <Input
                      key={index}
                      name={"otp-" + index}
                      type="text"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      maxLength={1}
                      className={"w-12 h-12 text-center text-xl font-bold rounded-xl border-2 transition-all duration-300 " +
                        (digit 
                          ? "border-green-500 bg-green-50 text-green-600 scale-110" 
                          : "border-gray-200 hover:border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        )}
                      style={{ animationDelay: index * 100 + "ms" }}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 6}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group mb-4"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      Verify & Continue
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  )}
                </Button>

                <div className="text-center">
                  <Button
                    onClick={handleResendOtp}
                    disabled={loading}
                    variant="link"
                    className="text-gray-600 hover:text-green-600 transition-colors duration-300 text-sm font-medium underline-offset-4 hover:underline"
                  >
                    Didn't receive code? Resend
                  </Button>
                </div>

                <div className="mt-6 text-center">
                  <Button
                    onClick={() => setShowOtpForm(false)}
                    variant="link"
                    className="text-green-600 hover:text-green-700 transition-colors duration-300 text-sm font-medium flex items-center justify-center gap-2 mx-auto"
                  >
                    ← Back to phone
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-8 animate-slideInFromBottom delay-1200">
            <p className="text-gray-500 text-sm">
              By continuing, you agree to our{" "}
              <button className="text-green-600 hover:underline">Terms</button> and{" "}
              <button className="text-green-600 hover:underline">Privacy Policy</button>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(180deg); }
        }
        
        @keyframes slideInFromTop {
          0% { transform: translateY(-50px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideInFromLeft {
          0% { transform: translateX(-50px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideInFromRight {
          0% { transform: translateX(50px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideInFromBottom {
          0% { transform: translateY(50px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-slideInFromTop { animation: slideInFromTop 0.8s ease-out forwards; }
        .animate-slideInFromLeft { animation: slideInFromLeft 0.8s ease-out forwards; }
        .animate-slideInFromRight { animation: slideInFromRight 0.8s ease-out forwards; }
        .animate-slideInFromBottom { animation: slideInFromBottom 0.8s ease-out forwards; }
        .delay-300 { animation-delay: 300ms; }
        .delay-600 { animation-delay: 600ms; }
        .delay-900 { animation-delay: 900ms; }
        .delay-1200 { animation-delay: 1200ms; }
      `}</style>
    </div>
  );
};

export default Auth;