import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (_req) => {
  // This is required for browser security
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the secure URL from the Supabase secret you set earlier
    const pythonServerUrl = Deno.env.get("PYTHON_SERVER_URL");
    if (!pythonServerUrl) {
      throw new Error("Python server URL is not configured in Supabase secrets.");
    }

    // Call the /generate-health-map endpoint on your Python server
    const response = await fetch(`${pythonServerUrl}/generate-health-map`);

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Python server failed with status ${response.status}: ${errorBody}`);
    }

    // Stream the image response directly back to your React app
    return new Response(response.body, {
        headers: { 
            ...corsHeaders,
            "Content-Type": "image/png" 
        },
        status: 200,
    });

  } catch (error) {
    console.error("Edge function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});