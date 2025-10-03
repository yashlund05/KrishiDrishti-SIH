import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CloudDrizzle, ThermometerSun, Wind, AlertTriangle, SprayCan } from "lucide-react";

// A type for the report items to ensure data consistency
type ReportItem = {
  risk?: string;
  condition?: string;
  level?: "High" | "Low";
  assessment?: "Good" | "Poor";
  details: string;
};

const RiskForecast = () => {
  const [report, setReport] = useState<ReportItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getRiskReport = async () => {
    setIsLoading(true);
    setError(null);
    setReport(null);

    // Coordinates for Pune, Maharashtra, India
    const PUNE_LAT = 18.5204;
    const PUNE_LON = 73.8567;

    try {
      const { data, error } = await supabase.functions.invoke("risk-forecast", {
        body: { lat: PUNE_LAT, lon: PUNE_LON },
      });

      if (error) throw error;

      setReport(data.report);
      toast({
        title: "Success",
        description: "Risk report generated successfully.",
      });
    } catch (err: any) {
      setError("Failed to fetch risk report. Please try again later.");
      toast({
        title: "Error",
        description: err.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getIconForRisk = (item: ReportItem) => {
    const title = item.risk || item.condition || "";
    if (title.includes("Fungal")) return <CloudDrizzle className="w-6 h-6 text-purple-500" />;
    if (title.includes("Drought")) return <ThermometerSun className="w-6 h-6 text-orange-500" />;
    if (title.includes("Flooding")) return <CloudDrizzle className="w-6 h-6 text-blue-500" />;
    if (title.includes("Spraying")) return <SprayCan className="w-6 h-6 text-green-500" />;
    return <AlertTriangle className="w-6 h-6 text-gray-500" />;
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-green-600" />
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">Agricultural Risk Forecast</CardTitle>
              <p className="text-gray-500">Get an AI-powered risk assessment for your farm.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <Button onClick={getRiskReport} disabled={isLoading} size="lg">
              {isLoading ? "Analyzing..." : "Generate Report for Pune"}
            </Button>
          </div>

          {error && <p className="text-center text-red-500 mt-4">{error}</p>}

          {report && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {report.map((item, index) => (
                <Card key={index} className={item.level === "High" || item.assessment === "Poor" ? "border-red-500 border-2" : ""}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                       {getIconForRisk(item)}
                       <CardTitle>{item.risk || item.condition}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-lg font-semibold ${item.level === "High" ? "text-red-600" : "text-green-600"}`}>
                      {item.level || item.assessment}
                    </p>
                    <p className="text-gray-600 mt-1">{item.details}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskForecast;