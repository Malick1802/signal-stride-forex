import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HistoricalDataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

serve(async (req) => {
  console.log('🔄 Historical Data Fetcher Started');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fastForexApiKey = Deno.env.get('FASTFOREX_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !fastForexApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request parameters
    const { symbol, startDate, endDate, timeframe } = await req.json();
    
    console.log(`📊 Fetching historical data for ${symbol} from ${startDate} to ${endDate}`);

    // For 70%+ win rate system: Fetch 5-10 years of historical data for backtesting
    const years = ['2020', '2021', '2022', '2023', '2024', '2025'];
    const allHistoricalData: HistoricalDataPoint[] = [];

    for (const year of years) {
      try {
        // FastForex historical data API call
        const historicalUrl = `https://api.fastforex.io/historical/${symbol}?from=${year}-01-01&to=${year}-12-31&api_key=${fastForexApiKey}`;
        
        console.log(`📈 Fetching ${symbol} data for ${year}...`);
        
        const response = await fetch(historicalUrl);
        
        if (!response.ok) {
          console.warn(`⚠️ Failed to fetch ${year} data for ${symbol}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        // Process and normalize the data
        if (data && data.results) {
          Object.entries(data.results).forEach(([date, rate]: [string, any]) => {
            allHistoricalData.push({
              timestamp: date,
              open: parseFloat(rate),
              high: parseFloat(rate) * 1.0015, // Simulate OHLC from single rate
              low: parseFloat(rate) * 0.9985,
              close: parseFloat(rate),
              volume: 1000 // Placeholder volume
            });
          });
        }
        
        // Rate limiting: Wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error fetching ${year} data for ${symbol}:`, error);
      }
    }

    console.log(`✅ Collected ${allHistoricalData.length} historical data points for ${symbol}`);

    // Store historical data in database for backtesting
    if (allHistoricalData.length > 0) {
      const { error: insertError } = await supabase
        .from('historical_market_data')
        .upsert(
          allHistoricalData.map(point => ({
            symbol: symbol,
            timestamp: point.timestamp,
            open_price: point.open,
            high_price: point.high,
            low_price: point.low,
            close_price: point.close,
            volume: point.volume,
            timeframe: timeframe || '1D',
            source: 'fastforex_historical'
          })), 
          { onConflict: 'symbol,timestamp,timeframe' }
        );

      if (insertError) {
        console.error('❌ Error storing historical data:', insertError);
        throw insertError;
      }

      console.log(`💾 Stored ${allHistoricalData.length} historical records for ${symbol}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        symbol,
        dataPoints: allHistoricalData.length,
        dateRange: {
          start: allHistoricalData[0]?.timestamp,
          end: allHistoricalData[allHistoricalData.length - 1]?.timestamp
        },
        message: `Historical data collection completed for ${symbol}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Historical data fetcher error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});