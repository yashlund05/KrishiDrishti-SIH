// supabase/functions/analyze-crop/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers to be used in all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", // Explicitly allow POST and OPTIONS
};

serve(async (req) => {
  // This is the crucial part that handles the browser's preflight check
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageDataUrl } = await req.json();

    // --- YOUR AI MODEL LOGIC GOES HERE ---
    console.log("Received image for analysis.");

    const analysisResult = {
      cropType: "Tomato Plant (from AI)",
      health: "Good",
      confidence: 88,
      diseases: [{ name: "Early Blight", severity: "Low", confidence: 75 }],
      recommendations: [
        "Isolate the plant to prevent spread.",
        "Apply a copper-based fungicide.",
        "Ensure good air circulation around the plant."
      ],
      nutrients: {
        nitrogen: "Optimal",
        phosphorus: "Slightly Low",
        potassium: "Good",
      }
    };

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});