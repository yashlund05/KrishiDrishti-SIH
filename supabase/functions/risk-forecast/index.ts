import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// --- Type Definitions for clarity ---
interface HourData {
  temp: number;
  humidity: number;
  precip: number;
  windspeed: number;
  windgust: number;
}

interface DayData {
  datetime: string;
  tempmax: number;
  tempmin: number;
  precip: number;
  uvindex: number;
  windspeed: number;
  hours: HourData[];
  temp?: number; // Optional average temp
  humidity?: number; // Optional average humidity
}

interface RiskResult {
  risk?: string;
  condition?: string;
  level?: "High" | "Low";
  assessment?: "Good" | "Poor";
  details: string;
}

// --- Risk Assessment Functions (Translated to TypeScript) ---
// Note: The logic from your Python script is preserved here.

function checkFungalDisease(days: DayData[]): RiskResult {
  for (const day of days) {
    let consecutiveHours = 0;
    let maxConsecutiveHours = 0;
    for (const hour of day.hours || []) {
      const { temp = 99, humidity = 0 } = hour;
      if (temp >= 20 && temp <= 28 && humidity > 85) {
        consecutiveHours++;
      } else {
        consecutiveHours = 0;
      }
      maxConsecutiveHours = Math.max(maxConsecutiveHours, consecutiveHours);
    }
    if (maxConsecutiveHours >= 6) {
      return {
        risk: "Fungal Disease (Powdery Mildew)",
        level: "High",
        details: `On ${day.datetime}, conditions are favorable for ${maxConsecutiveHours} consecutive hours.`,
      };
    }
  }
  return {
    risk: "Fungal Disease (Powdery Mildew)",
    level: "Low",
    details: "Conditions are not favorable for powdery mildew.",
  };
}

function checkDroughtStress(historyDays: DayData[]): RiskResult {
  let noRainDays = 0;
  for (let i = historyDays.length - 1; i >= 0; i--) {
    if (historyDays[i].precip === 0) {
      noRainDays++;
    } else {
      break;
    }
  }
  if (noRainDays >= 7 && (historyDays[historyDays.length - 1]?.tempmax ?? 0) > 32) {
    return {
      risk: "Drought Stress",
      level: "High",
      details: `No rainfall for ${noRainDays} consecutive days with high temperatures.`,
    };
  }
  return {
    risk: "Drought Stress",
    level: "Low",
    details: "Sufficient rainfall has occurred recently.",
  };
}

// ... (All other check functions like check_frost_risk, check_heat_stress etc. would be translated similarly)
// For brevity, I'll add a few more key ones. You can add the rest following the same pattern.

function checkFloodingRisk(days: DayData[]): RiskResult {
  const allPrecip = days.map(d => d.precip);
  for (let i = 0; i < days.length; i++) {
    const precip24h = days[i].precip;
    if (precip24h > 50) {
      return {
        risk: "Flooding / Root Rot",
        level: "High",
        details: `On ${days[i].datetime}, heavy rainfall of ${precip24h.toFixed(1)}mm is expected.`,
      };
    }
    if (i <= allPrecip.length - 3) {
      const precip72h = allPrecip.slice(i, i + 3).reduce((a, b) => a + b, 0);
      if (precip72h > 100) {
        return {
          risk: "Flooding / Root Rot",
          level: "High",
          details: `Starting ${days[i].datetime}, heavy rainfall of ${precip72h.toFixed(1)}mm is expected over 3 days.`,
        };
      }
    }
  }
  return {
    risk: "Flooding / Root Rot",
    level: "Low",
    details: "Forecast rainfall is below flood risk thresholds.",
  };
}

function checkSprayingConditions(days: DayData[]): RiskResult {
  const firstDayHours = days[0]?.hours ?? [];
  for (let i = 0; i < firstDayHours.length; i++) {
    const windSpeed = (firstDayHours[i].windspeed ?? 0) * 3.6; // m/s to km/h
    if (windSpeed > 15) {
      return {
        condition: "Spraying Conditions",
        assessment: "Poor",
        details: `Unsuitable due to high wind speed (${windSpeed.toFixed(1)} km/h).`,
      };
    }
    if (i <= firstDayHours.length - 6) {
      const rainNext6h = firstDayHours.slice(i, i + 6).reduce((sum, h) => sum + (h.precip ?? 0), 0);
      if (rainNext6h > 2) {
        return {
          condition: "Spraying Conditions",
          assessment: "Poor",
          details: `Unsuitable due to ${rainNext6h.toFixed(1)}mm rain expected in the next 6 hours.`,
        };
      }
    }
  }
  return {
    condition: "Spraying Conditions",
    assessment: "Good",
    details: "Conditions are favorable for spraying.",
  };
}


serve(async (req) => {
  // This is required for security and to allow your web app to call the function
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json(); // Expect latitude and longitude from the request
    const startDate = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];
    const endDate = new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0];

    const api_url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m,windgusts_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,windspeed_10m_max&start_date=${startDate}&end_date=${endDate}&timezone=auto`;

    const weatherResponse = await fetch(api_url);
    if (!weatherResponse.ok) throw new Error("Failed to fetch weather data.");
    const weatherData = await weatherResponse.json();

    // --- Data Transformation (same logic as your Python script) ---
    const allDaysRestructured: DayData[] = [];
    const dailyData = weatherData.daily;
    for (let i = 0; i < dailyData.time.length; i++) {
      allDaysRestructured.push({
        datetime: dailyData.time[i],
        tempmax: dailyData.temperature_2m_max[i],
        tempmin: dailyData.temperature_2m_min[i],
        precip: dailyData.precipitation_sum[i],
        uvindex: dailyData.uv_index_max[i],
        windspeed: dailyData.windspeed_10m_max[i],
        hours: [],
      });
    }

    const daysMap = new Map(allDaysRestructured.map(d => [d.datetime, d]));
    const hourlyData = weatherData.hourly;
    for (let i = 0; i < hourlyData.time.length; i++) {
        const dayKey = hourlyData.time[i].split('T')[0];
        if (daysMap.has(dayKey)) {
            daysMap.get(dayKey)!.hours.push({
                temp: hourlyData.temperature_2m[i],
                humidity: hourlyData.relativehumidity_2m[i],
                precip: hourlyData.precipitation[i],
                windspeed: hourlyData.windspeed_10m[i],
                windgust: hourlyData.windgusts_10m[i],
            });
        }
    }

    // --- Split data and run checks ---
    const todayStr = new Date().toISOString().split('T')[0];
    const historyDays = allDaysRestructured.filter(d => d.datetime < todayStr);
    const forecastDays = allDaysRestructured.filter(d => d.datetime >= todayStr);

    if (forecastDays.length === 0) throw new Error("No forecast data available.");

    // --- Build the Report ---
    // Add all your other check functions here to make the report complete
    const report: RiskResult[] = [
      checkFungalDisease(forecastDays),
      checkDroughtStress(historyDays),
      checkFloodingRisk(forecastDays),
      checkSprayingConditions(forecastDays),
      // e.g., checkHeatStress(forecastDays),
    ];

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});