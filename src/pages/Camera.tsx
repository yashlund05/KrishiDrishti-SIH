import { useState, useRef, useCallback } from "react";
import { Camera as CameraIcon, Zap, Scan, RefreshCw, Download, AlertTriangle, Eye, Sparkles, Target, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";

const Camera = () => {
  const [isCamera, setIsCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCamera(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({ title: "Camera Error", description: "Please grant camera permissions.", variant: "destructive" });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCamera(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL("image/jpeg");
        setCapturedImage(imageDataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setScanProgress(0);

    const progressInterval = setInterval(() => {
      setScanProgress(prev => Math.min(prev + Math.random() * 15, 95));
    }, 200);

    try {
      const { data, error } = await supabase.functions.invoke("plant-disease-detection", {
        body: { image: capturedImage },
      });
      
      clearInterval(progressInterval);
      setScanProgress(100);

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysisResult(data);
      toast({
        title: "Analysis Complete!",
        description: `Detected: ${data.cropType} (${data.health})`,
      });

    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('Error analyzing image:', error);
      toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setScanProgress(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-yellow-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-5"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${i * 2}s` }}
          >
            <div className="animate-float text-7xl">
              {["🔍", "📱", "🌱", "🤖", "⚡", "🎯"][i]}
            </div>
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 py-6 pb-24 relative z-10">
        <div className="mb-8 animate-slideInFromTop">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-xl border-4 border-white transform transition-all duration-500 hover:scale-110 hover:rotate-12">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
                AI Crop Vision
              </h1>
              <p className="text-gray-600 text-lg">
                Advanced plant analysis powered by machine learning
              </p>
            </div>
          </div>
        </div>

        {!analysisResult && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border-0 mb-8 overflow-hidden animate-slideInFromBottom delay-300">
            <div className="bg-gradient-to-r from-orange-500 to-green-500 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <CameraIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Smart Analysis Camera</h2>
                  <p className="text-white/80 text-sm">Real-time crop health detection</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {!isCamera && !capturedImage && (
                 <div className="text-center py-16 animate-slideInFromBottom delay-600">
                   <div className="space-y-4 max-w-sm mx-auto">
                     <button onClick={startCamera} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 group">
                       <div className="flex items-center justify-center gap-3">
                         <CameraIcon className="w-5 h-5" /> Open Camera
                       </div>
                     </button>
                     <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 text-gray-600 py-4 px-6 rounded-2xl font-semibold hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all duration-300 group">
                       <div className="flex items-center justify-center gap-3">
                         <Download className="w-5 h-5" /> Upload Image
                       </div>
                     </button>
                     <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                   </div>
                 </div>
              )}

              {isCamera && (
                <div className="relative animate-slideInFromRight">
                  <div className="relative rounded-2xl overflow-hidden bg-black">
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl" />
                  </div>
                  <div className="flex justify-center gap-4 mt-6">
                    <button onClick={capturePhoto} className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center group">
                      <CameraIcon className="w-7 h-7" />
                    </button>
                    <button onClick={stopCamera} className="w-16 h-16 bg-gray-500 text-white rounded-full shadow-xl flex items-center justify-center text-xl font-bold">
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {capturedImage && (
                <div className="space-y-6 animate-slideInFromLeft">
                  <div className="relative group">
                    <img src={capturedImage} alt="Captured crop" className="w-full rounded-2xl shadow-xl" />
                    <button onClick={resetAnalysis} className="absolute top-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-sm text-gray-700 rounded-full shadow-lg flex items-center justify-center group">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                  <button onClick={analyzeImage} disabled={isAnalyzing} className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-xl disabled:opacity-70 group">
                    {isAnalyzing ? (
                      <div className="flex items-center justify-center gap-3">
                        <Scan className="w-5 h-5 animate-spin" />
                        <span>Analyzing... {Math.round(scanProgress)}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <Zap className="w-5 h-5" /> Analyze with AI
                      </div>
                    )}
                  </button>
                  {isAnalyzing && (
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-blue-500" style={{ width: `${scanProgress}%` }} />
                    </div>
                  )}
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        )}

        {analysisResult && (
           <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border-0 overflow-hidden animate-slideInFromBottom delay-300">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">AI Analysis Results</h2>
                        <p className="text-white/80 text-sm">Powered by advanced ML models</p>
                    </div>
                </div>
                <button onClick={resetAnalysis} className="bg-white/20 text-white py-2 px-4 rounded-lg hover:bg-white/30 transition-colors">Analyze New Image</button>
            </div>
            <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-6 bg-green-50 rounded-2xl border">
                        <div className="text-3xl font-bold text-green-600 mb-2">{analysisResult.confidence}%</div>
                        <div className="text-sm font-medium text-green-700">Confidence Score</div>
                    </div>
                    <div className="text-center p-6 bg-blue-50 rounded-2xl border">
                        <div className="text-xl font-bold text-blue-600 mb-2">{analysisResult.health}</div>
                        <div className="text-sm font-medium text-blue-700">Health Status</div>
                    </div>
                </div>
                <div>
                    <h4 className="text-lg font-bold text-gray-800 mb-4">Crop Identification</h4>
                    <div className="p-6 bg-gray-50 rounded-2xl border">
                        <p className="text-2xl font-bold text-gray-700">{analysisResult.cropType}</p>
                    </div>
                </div>
                {analysisResult.diseases?.length > 0 && (
                    <div>
                        <h4 className="text-lg font-bold text-gray-800 mb-4">Health Issues Detected</h4>
                        <div className="space-y-3">
                            {analysisResult.diseases.map((disease: any, index: number) => (
                                <div key={index} className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-semibold text-orange-700">{disease.name}</span>
                                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${disease.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{disease.severity}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <h4 className="text-lg font-bold text-gray-800 mb-4">AI Recommendations</h4>
                    <div className="space-y-3">
                        {analysisResult.recommendations.map((rec: string, index: number) => (
                            <div key={index} className="flex items-start gap-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold">{index + 1}</div>
                                <p className="text-gray-700 font-medium">{rec}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
};

export default Camera;