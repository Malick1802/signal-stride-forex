import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Country to language mapping
const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  'US': 'en', 'GB': 'en', 'AU': 'en', 'CA': 'en', 'IE': 'en', 'NZ': 'en',
  'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'VE': 'es', 'PE': 'es',
  'FR': 'fr', 'BE': 'fr', 'CH': 'fr',
  'DE': 'de', 'AT': 'de',
  'BR': 'pt', 'PT': 'pt',
  'JP': 'ja',
  'CN': 'zh', 'TW': 'zh', 'HK': 'zh', 'SG': 'zh',
  'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'JO': 'ar', 'LB': 'ar'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get country from Cloudflare header (most reliable for location detection)
    const country = req.headers.get('CF-IPCountry') || 
                   req.headers.get('X-Vercel-IP-Country') ||
                   req.headers.get('X-Country-Code');

    console.log('🌍 Detected country:', country);

    let detectedLanguage = 'en'; // Default fallback

    if (country && COUNTRY_TO_LANGUAGE[country]) {
      detectedLanguage = COUNTRY_TO_LANGUAGE[country];
      console.log(`✅ Mapped ${country} to language: ${detectedLanguage}`);
    } else {
      console.log(`⚠️ Country ${country} not mapped, using default: ${detectedLanguage}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        country,
        language: detectedLanguage,
        source: 'ip_detection'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error detecting user location:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        language: 'en' // Fallback to English
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200, // Return 200 even on error to allow graceful fallback
      }
    );
  }
});