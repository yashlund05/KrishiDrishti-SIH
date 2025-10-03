import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, voice = 'alloy', language = 'en' } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    console.log('Generating speech for text:', text, 'voice:', voice, 'language:', language);

    // ElevenLabs voices for different languages/purposes
    const voiceMap: Record<string, string> = {
      'alloy': '9BWtsMINqrJLrRacOk9x', // Aria
      'echo': 'CwhRBWXzGAHq8TQ4Fs17', // Roger  
      'fable': 'EXAVITQu4vr4xnSDxMaL', // Sarah
      'onyx': 'JBFqnCBsd6RMkjVDRZzb', // George
      'nova': 'FGY2WhTYpPnrIDTdsKH5', // Laura
      'shimmer': 'XB0fDUnXU5powFXDhCwa' // Charlotte
    };

    const elevenlabsVoiceId = voiceMap[voice] || voiceMap['alloy'];
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!elevenlabsApiKey) {
      console.log('ElevenLabs API key not found, falling back to OpenAI TTS');
      
      // Fallback to OpenAI TTS
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer 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`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voice,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI TTS error: ${error}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      return new Response(
        JSON.stringify({ audioContent: base64Audio }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use ElevenLabs for better quality
    const elevenlabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenlabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!elevenlabsResponse.ok) {
      const error = await elevenlabsResponse.text();
      console.error('ElevenLabs API error:', error);
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    const arrayBuffer = await elevenlabsResponse.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});