import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/components/ui/use-toast";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Sprout, Droplets, Sun, Thermometer, BrainCircuit, Map,
  UploadCloud, CheckCircle, AlertTriangle, X 
} from "lucide-react";

// This tells TypeScript that 'ort' is a global variable from the script tag in index.html
declare const ort: any;

// --- AI Model Configuration ---
const MODEL_URL = "https://tfohpwclpbfxftgfolwz.supabase.co/storage/v1/object/public/model.onnx/model.onnx";
const MODEL_LABELS = ['Healthy', 'Weed Cluster']; 
const MODEL_INPUT_SHAPE = [1, 3, 224, 224];

const Dashboard = () => {
  // --- State for Dashboard Data ---
  const [metrics, setMetrics] = useState({ soilHealth: 85, moisture: 70, sunlight: 8, temperature: 25 });
  const [crops, setCrops] = useState<any[]>([]);
  const [userDetails, setUserDetails] = useState({ name: "Loading...", location: "...", farmSize: 0 });
  const [animatedMetrics, setAnimatedMetrics] = useState({ soilHealth: 0, moisture: 0, sunlight: 0, temperature: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState("afternoon");
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- State for Health Map ---
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // --- State for Anomaly Classifier ---
  const [session, setSession] = useState<any | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<{ label: string; confidence: number } | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // --- Data Fetching and Initialization ---
  useEffect(() => {
    // Fetch user and farm details
    const checkFarmDetails = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: farmData } = await supabase.from("farm_details").select("*").eq("user_id", user.id).single();
      if (!farmData) { navigate("/info"); return; }
      setUserDetails({ name: farmData.full_name || "Farmer", location: farmData.location || "Unknown", farmSize: farmData.farm_size || 0 });
      const cropList = farmData.crop_specialization ? JSON.parse(farmData.crop_specialization) : [];
      const acresPerCrop = (farmData.farm_size || 0) / Math.max(cropList.length, 1);
      setCrops(cropList.map((name: string, id: number) => ({ id, name, acres: acresPerCrop, status: "Growing", health: 85 + Math.floor(Math.random() * 10) })));
      setIsLoading(false);
    };

    // Load the AI model
    const loadModel = async () => {
      try {
        ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/";
        const newSession = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ["webgl", "wasm"] });
        setSession(newSession);
      } catch (e) {
        console.error("Failed to load the ONNX model:", e);
        setModelError("Could not load the AI model.");
      } finally {
        setIsLoadingModel(false);
      }
    };

    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay("morning");
    else if (hour < 18) setTimeOfDay("afternoon");
    else setTimeOfDay("evening");

    checkFarmDetails();
    loadModel();
  }, [navigate]);

  // Animate metrics
  useEffect(() => {
    if (isLoading) return;
    const timers = Object.keys(metrics).map(key => {
      const target = metrics[key as keyof typeof metrics];
      const interval = setInterval(() => {
        setAnimatedMetrics(prev => {
          const current = prev[key as keyof typeof prev];
          const diff = target - current;
          if (Math.abs(diff) < 0.1) { clearInterval(interval); return { ...prev, [key]: target }; }
          return { ...prev, [key]: parseFloat((current + diff * 0.1).toFixed(1)) };
        });
      }, 25);
      return interval;
    });
    return () => timers.forEach(clearInterval);
  }, [isLoading, metrics]);

  // --- Feature Logic ---
  const generateMap = async () => {
    setIsMapLoading(true);
    setMapError(null);
    setMapImageUrl(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("health-map");
      if (invokeError) throw invokeError;
      
      const url = URL.createObjectURL(data);
      setMapImageUrl(url);
      toast({ title: "Success!", description: "Vegetation health map generated." });
    } catch (err: any) {
      setMapError("Failed to generate the health map. Please try again later.");
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsMapLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target?.result as string);
      reader.readAsDataURL(acceptedFiles[0]);
      setPrediction(null);
    }
  }, []);

  const handleAnalysis = async () => {
    if (!selectedImage || !session) return;
    setIsProcessing(true);
    setPrediction(null);
    setModelError(null);
    try {
      const image = new Image();
      image.src = selectedImage;
      image.onload = async () => {
        const tensor = await preprocessImage(image);
        const feeds: Record<string, any> = { [session.inputNames[0]]: tensor };
        const results = await session.run(feeds);
        const outputTensor = results[session.outputNames[0]];
        const probabilities = softmax(outputTensor.data as Float32Array);
        const maxProb = Math.max(...probabilities);
        const maxIndex = probabilities.indexOf(maxProb);
        setPrediction({ label: MODEL_LABELS[maxIndex], confidence: maxProb });
      };
    } catch (e) {
      console.error("Error during analysis:", e);
      setModelError("An error occurred while analyzing the image.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: false });

  // --- UI Rendering ---
  const getGreeting = () => {
    const greetings = { morning: "Good Morning", afternoon: "Good Afternoon", evening: "Good Evening" };
    return `${greetings[timeOfDay]}, ${userDetails.name.split(" ")[0]}!`;
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div></div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24 space-y-8">
      {/* Header and Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">{getGreeting()}</h1>
        <p className="text-gray-600">Your farm spans {userDetails.farmSize} acres. Let's see how everything is growing! 🌱</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Sprout} value={animatedMetrics.soilHealth} unit="%" label="Soil Health" color="green" />
        <MetricCard icon={Droplets} value={animatedMetrics.moisture} unit="%" label="Moisture" color="blue" />
        <MetricCard icon={Sun} value={animatedMetrics.sunlight} unit="h" label="Sunlight" color="yellow" />
        <MetricCard icon={Thermometer} value={animatedMetrics.temperature} unit="°C" label="Temperature" color="orange" />
      </div>

      {/* Vegetation Health Map Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Map className="w-8 h-8 text-green-600" />
            <div>
              <CardTitle className="text-2xl">🌍 Vegetation Health Map</CardTitle>
              <CardDescription>Get a color-coded health map of your entire farm.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <Button onClick={generateMap} disabled={isMapLoading} size="lg">
              {isMapLoading ? "Generating Map..." : "Generate Health Map"}
            </Button>
          </div>
          <div className="min-h-[300px] border rounded-lg flex items-center justify-center bg-gray-50">
            {isMapLoading && <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>}
            {mapError && <p className="text-red-500 flex items-center gap-2"><AlertTriangle /> {mapError}</p>}
            {mapImageUrl && <img src={mapImageUrl} alt="Farm Health Map" className="rounded-lg max-w-full max-h-[500px]" />}
            {!isMapLoading && !mapError && !mapImageUrl && <p className="text-gray-500">Your farm's health map will appear here.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Your Crops Section */}
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Your Crops 🌾</h3>
        <div className="space-y-4">
          {crops.map(crop => <CropCard key={crop.id} crop={crop} />)}
        </div>
      </div>
      
      {/* Anomaly Classifier Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <BrainCircuit className="w-8 h-8 text-green-600" />
            <div>
              <CardTitle className="text-2xl">🔬 Anomaly Classifier</CardTitle>
              <CardDescription>Upload a crop zone image to detect issues like weed clusters.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedImage ? (
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-green-600 bg-green-50' : 'border-gray-300 hover:border-green-500'}`}>
              <input {...getInputProps()} />
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600">Drag & drop an image here, or click to select a file</p>
            </div>
          ) : (
            <div className="text-center">
              <img src={selectedImage} alt="Selected crop" className="max-h-64 mx-auto rounded-lg shadow-md" />
              <div className="mt-4 flex justify-center gap-4">
                <Button onClick={() => setSelectedImage(null)} variant="outline"><X className="mr-2 h-4 w-4" /> Clear</Button>
                <Button onClick={handleAnalysis} disabled={isProcessing || isLoadingModel}>{isProcessing ? "Analyzing..." : "Run Analysis"}</Button>
              </div>
            </div>
          )}
          <div className="mt-6 min-h-[90px]">
            {isLoadingModel && <p className="text-center text-gray-500">Loading AI model...</p>}
            {modelError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{modelError}</AlertDescription></Alert>}
            {prediction && (
              <Alert variant={prediction.label === 'Healthy' ? "default" : "destructive"}>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle className="text-xl font-bold">{prediction.label} Detected</AlertTitle>
                <AlertDescription>Confidence: <span className="font-semibold">{(prediction.confidence * 100).toFixed(1)}%</span></AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- Child Components for Cleaner Code ---
const MetricCard = ({ icon: Icon, value, unit, label, color }: any) => (
  <Card className="shadow-md hover:shadow-xl transition-shadow"><CardContent className="p-4 flex items-center space-x-4"><div className={`p-3 rounded-full bg-${color}-100`}><Icon className={`w-6 h-6 text-${color}-600`} /></div><div><div className="text-2xl font-bold text-gray-800">{value}{unit}</div><div className="text-sm text-gray-500">{label}</div></div></CardContent></Card>
);
const CropCard = ({ crop }: any) => (
  <Card className="shadow-md hover:shadow-xl transition-shadow"><CardContent className="p-4"><div className="flex justify-between items-center mb-2"><div><h4 className="font-bold text-lg text-gray-800">{crop.name}</h4><p className="text-sm text-gray-600">{crop.acres.toFixed(1)} acres • {crop.status}</p></div><div className="text-right"><div className="font-bold text-xl text-gray-800">{crop.health}%</div><div className="text-sm text-gray-500">Health Score</div></div></div><div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${crop.health}%` }}></div></div></CardContent></Card>
);
// --- Helper Functions for Model Processing ---
async function preprocessImage(image: HTMLImageElement): Promise<any> {
  const canvas = document.createElement('canvas');
  const [,, height, width] = MODEL_INPUT_SHAPE;
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const float32Data = new Float32Array(width * height * 3);
  for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
    float32Data[j] = imageData.data[i] / 255.0;
    float32Data[j + width * height] = imageData.data[i + 1] / 255.0;
    float32Data[j + width * height * 2] = imageData.data[i + 2] / 255.0;
  }
  return new ort.Tensor('float32', float32Data, MODEL_INPUT_SHAPE);
}
function softmax(data: Float32Array): number[] {
  const max = Math.max(...data);
  const exps = data.map(x => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b);
  return exps.map(x => x / sum);
}

export default Dashboard;