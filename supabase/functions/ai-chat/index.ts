import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, language = 'en' } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    // System prompts for different languages
    const systemPrompts = {
      en: 'You are an AI assistant specialized in farming and agriculture. Provide helpful, accurate advice about crops, soil health, irrigation, pest management, and other farming topics. Keep responses concise but informative.',
      es: 'Eres un asistente de IA especializado en agricultura. Proporciona consejos útiles y precisos sobre cultivos, salud del suelo, riego, manejo de plagas y otros temas agrícolas. Mantén las respuestas concisas pero informativas.',
      fr: 'Vous êtes un assistant IA spécialisé dans l\'agriculture. Fournissez des conseils utiles et précis sur les cultures, la santé des sols, l\'irrigation, la gestion des ravageurs et autres sujets agricoles. Gardez les réponses concises mais informatives.',
      hi: 'आप कृषि और खेती में विशेषज्ञ एआई सहायक हैं। फसलों, मिट्टी की सेहत, सिंचाई, कीट प्रबंधन और अन्य कृषि विषयों पर सहायक, सटीक सलाह दें। जवाब संक्षिप्त लेकिन जानकारीपूर्ण रखें।',
      pt: 'Você é um assistente de IA especializado em agricultura. Forneça conselhos úteis e precisos sobre cultivos, saúde do solo, irrigação, manejo de pragas e outros tópicos agrícolas. Mantenha as respostas concisas mas informativas.',
    };

    const systemPrompt = systemPrompts[language as keyof typeof systemPrompts] || systemPrompts.en;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API error:', errorData);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const botResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.";

    return new Response(JSON.stringify({ message: botResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to get response from AI assistant'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});