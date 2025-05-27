
export async function fetchMarketData(supabase: any) {
  const { data: marketData, error: marketError } = await supabase
    .from('centralized_market_state')
    .select('*')
    .order('last_update', { ascending: false });

  if (marketError || !marketData?.length) {
    console.log('⚠️ No market data available for analysis');
    return null;
  }

  return marketData;
}

export async function fetchHistoricalData(supabase: any, pair: string) {
  const { data: historicalData } = await supabase
    .from('live_market_data')
    .select('*')
    .eq('symbol', pair)
    .order('timestamp', { ascending: false })
    .limit(50);

  return historicalData || [];
}
